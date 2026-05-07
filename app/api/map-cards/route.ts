/**
 * GET  /api/map-cards — list all MAP cards
 * POST /api/map-cards — create a new MAP card
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const oblId = req.nextUrl.searchParams.get("obligation_id");
  const status = req.nextUrl.searchParams.get("status");
  let query = supabase.from("map_cards").select("*").order("created_at", { ascending: false });
  if (oblId) query = query.eq("obligation_id", oblId);
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

  const { title, obligation_id, owner, due_date, priority } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!obligation_id) return NextResponse.json({ error: "obligation_id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("map_cards")
    .insert({
      title: String(title),
      obligation_id: String(obligation_id),
      owner: String(owner ?? "Compliance Team"),
      due_date: (due_date as string) ?? new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "backlog",
      priority: (priority as string) ?? "medium",
      escalated: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await supabase.from("audit_trail").insert({
    action: "obligation_created",
    actor: String(body.created_by ?? "Compliance Officer"),
    actor_role: "compliance_officer",
    target: String(title),
    target_id: data.id,
    details: `Created MAP card: ${title}`,
    severity: "info",
    metadata: { obligation_id, owner, priority },
  });

  return NextResponse.json(data, { status: 201 });
}
