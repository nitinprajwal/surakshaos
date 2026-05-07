/**
 * POST /api/evidence — add evidence to an obligation
 * GET  /api/evidence?obligation_id=xxx — list evidence for an obligation
 * PUT  /api/evidence?id=xxx — mark evidence collected/uncollected
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const oblId = req.nextUrl.searchParams.get("obligation_id");
  const supabase = getSupabaseServerClient();
  let query = supabase.from("evidence").select("*").order("created_at", { ascending: true });
  if (oblId) query = query.eq("obligation_id", oblId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { obligation_id, document_id, title, description } = body;
  if (!obligation_id || !title) {
    return NextResponse.json({ error: "obligation_id and title are required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("evidence")
    .insert({
      obligation_id: String(obligation_id),
      document_id: document_id ? String(document_id) : null,
      title: String(title),
      description: String(description ?? ""),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update evidence_count on obligation (best-effort)
  try { await supabase.rpc("increment_evidence_count", { obl_id: obligation_id }); } catch { /* ignore */ }

  // Audit
  await supabase.from("audit_trail").insert({
    action: "evidence_added",
    actor: "Compliance Officer",
    actor_role: "compliance_officer",
    target: String(title),
    target_id: String(obligation_id),
    details: `Evidence added: ${title}`,
    severity: "info",
    metadata: { obligation_id },
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = getSupabaseServerClient();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const collected = body.collected as boolean;
  const { data, error } = await supabase
    .from("evidence")
    .update({ collected_at: collected ? new Date().toISOString().split("T")[0] : new Date().toISOString().split("T")[0] })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
