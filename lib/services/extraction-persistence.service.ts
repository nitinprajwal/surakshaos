/**
 * Extraction Persistence Service
 *
 * Writes AI-extracted obligations to Supabase and updates the parent
 * document row (status, obligation count, confidence score).
 *
 * SERVER-ONLY — uses the service_role client which bypasses RLS.
 * Must only be imported from API routes or Server Components.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ObligationInsert } from "@/lib/supabase/database.types";
import type { ExtractedObligation, ExtractionResult } from "@/types/extraction";

// ---------------------------------------------------------------------------
// Helpers — map extraction types to DB types
// ---------------------------------------------------------------------------

/**
 * Derive an initial DB status from the obligation's compliance risk.
 * Higher risk obligations are flagged immediately for review.
 */
function toDbStatus(risk: ExtractedObligation["compliance_risk"]): ObligationInsert["status"] {
  switch (risk) {
    case "critical": return "at_risk";
    case "high":     return "pending_review";
    default:         return "in_progress";
  }
}

/**
 * Build a 90-day fallback due date (ISO date string) for obligations
 * where no explicit deadline was extracted.
 */
function fallbackDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
}

/**
 * Build an ObligationInsert row from a single extracted obligation
 * plus the document-level extraction metadata.
 *
 * @param index  zero-based position within the batch (used to ensure
 *               unique `reference` when citations are missing or duplicated)
 */
function buildInsertRow(
  obl: ExtractedObligation,
  meta: Pick<ExtractionResult, "regulation_name" | "jurisdiction">,
  index: number
): ObligationInsert {
  // Keep title concise: first 120 characters of the obligation text
  const title =
    obl.obligation_text.length > 120
      ? obl.obligation_text.slice(0, 117).trimEnd() + "…"
      : obl.obligation_text;

  // Tags: citation + evidence items — deduplicated, non-empty strings only
  const tags = [...new Set([obl.citation, ...obl.evidence_required].filter(Boolean))];

  // Reference must be globally unique — append regulation short code + index
  // so that obligations without citations never collide across documents.
  const regShort = meta.regulation_name.replace(/[^A-Z0-9]/gi, "").slice(0, 12).toUpperCase();
  const reference = obl.citation
    ? `${obl.citation.slice(0, 80)}-${regShort}-${index}`
    : `OBL-${regShort}-${index}-${Date.now()}`;

  return {
    reference,
    title,
    description:      obl.obligation_text,
    regulation:       meta.regulation_name,
    jurisdiction:     meta.jurisdiction,
    department:       obl.department,
    owner:            "Compliance Team",          // default; editable post-creation
    status:           toDbStatus(obl.compliance_risk),
    priority:         obl.priority,               // both use "critical"|"high"|"medium"|"low"
    due_date:         obl.deadline ?? fallbackDueDate(),
    confidence_score: obl.confidence,
    evidence_count:   obl.evidence_required.length,
    tags,
  };
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PersistenceResult {
  /** Number of obligation rows successfully inserted */
  stored_count: number;
  /** IDs of inserted obligation rows */
  inserted_ids: string[];
  /** Non-fatal per-batch errors (insertion continues on partial failure) */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Maximum rows per Supabase INSERT call */
const BATCH_SIZE = 25;

export const extractionPersistenceService = {
  /**
   * Insert all obligations from an ExtractionResult into Supabase
   * and update the linked document row.
   *
   * Errors are collected and returned — they do not throw — so a partial
   * DB write still returns a valid result rather than losing all data.
   *
   * @param extraction   The full ExtractionResult from extractionService
   * @param documentId   The documents table row ID to link and update
   */
  async persist(
    extraction: ExtractionResult,
    documentId: string
  ): Promise<PersistenceResult> {
    const supabase = getSupabaseServerClient();
    const { obligations, regulation_name, jurisdiction } = extraction;

    const insertedIds: string[] = [];
    const insertedObligations: ExtractedObligation[] = [];
    const errors: string[] = [];

    // ── Insert obligations in batches ────────────────────────────────────
    for (let i = 0; i < obligations.length; i += BATCH_SIZE) {
      const batchObls = obligations.slice(i, i + BATCH_SIZE);
      const batch = batchObls.map((obl, batchIdx) =>
        buildInsertRow(obl, { regulation_name, jurisdiction }, i + batchIdx)
      );

      const { data, error } = (await supabase
        .from("obligations")
        .insert(batch)
        .select("id")) as unknown as {
        data: { id: string }[] | null;
        error: { message: string } | null;
      };

      if (error) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        errors.push(`Batch ${batchNum}: ${error.message}`);
      } else if (data) {
        insertedIds.push(...data.map((r) => r.id));
        insertedObligations.push(...batchObls.slice(0, data.length));
      }
    }

    // ── Update document row ──────────────────────────────────────────────
    // Compute average confidence across all obligations (not just inserted ones)
    const avgConfidence =
      obligations.length > 0
        ? Math.round(
            obligations.reduce((sum, o) => sum + o.confidence, 0) / obligations.length
          )
        : 0;

    const { error: docError } = (await supabase
      .from("documents")
      .update({
        status:                 "processed",
        obligations_extracted:  insertedIds.length,
        confidence_score:       avgConfidence,
        processed_at:           new Date().toISOString(),
      })
      .eq("id", documentId)) as unknown as { error: { message: string } | null };

    if (docError) {
      errors.push(`Document update failed: ${docError.message}`);
    }

    // ── Auto-create MAP cards for inserted obligations ───────────────────
    createMapCards(insertedIds, insertedObligations, supabase).catch((e) => {
      console.warn("[extraction-persistence] MAP card creation failed:", e);
    });

    // ── Update department risk scores ────────────────────────────────────
    updateRiskScores(obligations, supabase).catch((e) => {
      console.warn("[extraction-persistence] Risk score update failed:", e);
    });

    // ── Update compliance trends for current month ───────────────────────
    updateComplianceTrends(obligations, insertedIds.length, supabase).catch((e) => {
      console.warn("[extraction-persistence] Compliance trends update failed:", e);
    });

    return {
      stored_count: insertedIds.length,
      inserted_ids: insertedIds,
      errors,
    };
  },
};

// ---------------------------------------------------------------------------
// Private helpers — called within persist()
// ---------------------------------------------------------------------------

async function createMapCards(
  obligationIds: string[],
  obligations: ExtractedObligation[],
  supabase: ReturnType<typeof getSupabaseServerClient>
): Promise<void> {
  if (obligationIds.length === 0) return;

  const mapCards = obligationIds.map((oblId, i) => {
    const obl = obligations[i];
    const dueDate = obl?.deadline ?? fallbackDueDate();
    return {
      title:         obl?.obligation_text.slice(0, 120).trimEnd() ?? "Compliance Task",
      obligation_id: oblId,
      owner:         "Compliance Team",
      due_date:      dueDate,
      status:        "backlog" as const,
      priority:      (obl?.priority ?? "medium") as "critical" | "high" | "medium" | "low",
      escalated:     obl?.compliance_risk === "critical",
    };
  });

  // Insert in batches of 50
  for (let i = 0; i < mapCards.length; i += 50) {
    const batch = mapCards.slice(i, i + 50);
    await supabase.from("map_cards").insert(batch);
  }
}

async function updateRiskScores(
  obligations: ExtractedObligation[],
  supabase: ReturnType<typeof getSupabaseServerClient>
): Promise<void> {
  // Group obligations by department
  const byDept: Record<string, ExtractedObligation[]> = {};
  for (const obl of obligations) {
    const dept = obl.department || "Compliance";
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(obl);
  }

  for (const [dept, oblList] of Object.entries(byDept)) {
    const criticalCount = oblList.filter((o) => o.compliance_risk === "critical").length;
    const highCount     = oblList.filter((o) => o.compliance_risk === "high").length;
    const mediumCount   = oblList.filter((o) => o.compliance_risk === "medium").length;

    // Score: start at 85, penalise for risk
    const penalty = criticalCount * 8 + highCount * 4 + mediumCount * 1;
    const score   = Math.max(10, Math.min(95, 85 - penalty));

    // Fetch existing score to determine trend
    const { data: existing } = await supabase
      .from("risk_scores")
      .select("score")
      .eq("department", dept)
      .maybeSingle() as unknown as { data: { score: number } | null };

    const prevScore  = existing?.score ?? score;
    const trend: "up" | "down" | "stable" =
      score > prevScore ? "up" : score < prevScore ? "down" : "stable";

    await supabase
      .from("risk_scores")
      .upsert(
        {
          department:        dept,
          score,
          trend,
          overdue_count:     0,
          total_obligations: oblList.length,
          updated_at:        new Date().toISOString(),
        },
        { onConflict: "department" }
      );
  }
}

async function updateComplianceTrends(
  obligations: ExtractedObligation[],
  insertedCount: number,
  supabase: ReturnType<typeof getSupabaseServerClient>
): Promise<void> {
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "short" });
  const year      = now.getFullYear();

  // Average confidence as a compliance score proxy
  const avgScore =
    obligations.length > 0
      ? Math.round(obligations.reduce((s, o) => s + o.confidence, 0) / obligations.length)
      : 75;

  // Get existing trend record for this month
  const { data: existing } = await supabase
    .from("compliance_trends")
    .select("obligations, resolved")
    .eq("month", monthName)
    .eq("year", year)
    .maybeSingle() as unknown as { data: { obligations: number; resolved: number } | null };

  const prevObl  = existing?.obligations  ?? 0;
  const prevRes  = existing?.resolved     ?? 0;

  await supabase
    .from("compliance_trends")
    .upsert(
      {
        month:       monthName,
        year,
        score:       avgScore,
        obligations: prevObl + insertedCount,
        resolved:    prevRes,
        recorded_at: now.toISOString(),
      },
      { onConflict: "month,year" }
    );
}
