/**
 * GET  /api/obligations/[id]   — fetch single obligation
 * PUT  /api/obligations/[id]   — update obligation fields
 * DELETE /api/obligations/[id] — delete obligation
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  // Support lookup by UUID or reference string
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data, error } = isUuid
    ? await supabase.from("obligations").select("*").eq("id", id).single()
    : await supabase.from("obligations").select("*").eq("reference", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow updating these fields
  const allowedFields = ["title", "description", "regulation", "jurisdiction", "department", "owner", "status", "priority", "due_date", "tags"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = isUuid
    ? supabase.from("obligations").update(updates).eq("id", id).select().single()
    : supabase.from("obligations").update(updates).eq("reference", id).select().single();

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabase.from("audit_trail").insert({
    action: "obligation_updated",
    actor: String(body.updated_by ?? "Compliance Officer"),
    actor_role: "compliance_officer",
    target: String(data.title ?? id),
    target_id: id,
    details: `Updated obligation fields: ${Object.keys(updates).filter(k => k !== "updated_at").join(", ")}`,
    severity: "info",
    metadata: updates,
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  // Fetch title for audit log
  const isUuidDel = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data: existing } = isUuidDel
    ? await supabase.from("obligations").select("id, title").eq("id", id).single()
    : await supabase.from("obligations").select("id, title").eq("reference", id).single();

  const realId = existing?.id ?? id;

  // Delete linked map_cards and evidence using the real UUID
  await supabase.from("map_cards").delete().eq("obligation_id", realId);
  await supabase.from("evidence").delete().eq("obligation_id", realId);

  const { error } = isUuidDel
    ? await supabase.from("obligations").delete().eq("id", id)
    : await supabase.from("obligations").delete().eq("reference", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabase.from("audit_trail").insert({
    action: "obligation_closed",
    actor: "Compliance Officer",
    actor_role: "compliance_officer",
    target: existing?.title ?? id,
    target_id: realId,
    details: `Deleted obligation: ${existing?.title ?? id}`,
    severity: "warning",
    metadata: {},
  });

  return NextResponse.json({ success: true });
}
