/**
 * GET  /api/obligations — list all obligations
 * POST /api/obligations — create a new obligation manually
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const dept = req.nextUrl.searchParams.get("department");
  const status = req.nextUrl.searchParams.get("status");
  let query = supabase.from("obligations").select("*").order("created_at", { ascending: false });
  if (dept) query = query.eq("department", dept);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, regulation, jurisdiction, department, owner, status, priority, due_date, confidence_score, tags } = body;

  if (!title || !department) {
    return NextResponse.json({ error: "title and department are required" }, { status: 400 });
  }

  const now = Date.now();
  const { data, error } = await supabase
    .from("obligations")
    .insert({
      reference: `MANUAL-${department?.toString().toUpperCase().slice(0,6)}-${now}`,
      title: String(title),
      description: String(description ?? ""),
      regulation: String(regulation ?? "Manual Entry"),
      jurisdiction: String(jurisdiction ?? "India"),
      department: String(department),
      owner: String(owner ?? "Compliance Team"),
      status: (status as string) ?? "in_progress",
      priority: (priority as string) ?? "medium",
      due_date: (due_date as string) ?? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      confidence_score: Number(confidence_score ?? 100),
      evidence_count: 0,
      tags: Array.isArray(tags) ? tags : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabase.from("audit_trail").insert({
    action: "obligation_created",
    actor: String(body.created_by ?? "Compliance Officer"),
    actor_role: "compliance_officer",
    target: String(title),
    target_id: data.id,
    details: `Manually created obligation: ${title}`,
    severity: "info",
    metadata: { department, priority, status },
  });

  return NextResponse.json(data, { status: 201 });
}
