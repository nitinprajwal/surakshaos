import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[notifications GET]", err);
    return NextResponse.json([], { status: 500 });
  }
}

// PATCH — mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const { id, all } = await req.json();
    const supabase = getSupabaseServerClient();
    if (all) {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications PATCH]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — create notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({ title: body.title, message: body.message, type: body.type ?? "info", target_type: body.target_type ?? null, target_id: body.target_id ?? null })
      .select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[notifications POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
