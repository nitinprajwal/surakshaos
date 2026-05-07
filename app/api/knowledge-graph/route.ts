import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch obligations with their source documents
    const { data: obligations } = await supabase
      .from("obligations")
      .select("id, title, department, priority, status, compliance_risk, regulation, confidence_score")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: documents } = await supabase
      .from("documents")
      .select("id, filename, status")
      .eq("status", "processed")
      .limit(10);

    const { data: mapCards } = await supabase
      .from("map_cards")
      .select("id, title, obligation_id, status, priority")
      .limit(30);

    const { data: evidence } = await supabase
      .from("evidence")
      .select("id, title, obligation_id, collected_at")
      .limit(40);

    // Build graph nodes and edges
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const departments = new Set<string>();

    // Document nodes
    (documents ?? []).forEach((doc) => {
      nodes.push({
        id: `doc-${doc.id}`,
        type: "document",
        label: doc.filename?.replace(".pdf", "") ?? "Document",
        data: { status: doc.status, icon: "FileText" },
      });
    });

    // Department nodes (collect unique departments)
    (obligations ?? []).forEach((obl) => {
      if (obl.department) departments.add(obl.department);
    });
    departments.forEach((dept) => {
      nodes.push({
        id: `dept-${dept}`,
        type: "department",
        label: dept,
        data: { icon: "Building2" },
      });
    });

    // Obligation nodes
    (obligations ?? []).forEach((obl) => {
      nodes.push({
        id: `obl-${obl.id}`,
        type: "obligation",
        label: obl.title?.slice(0, 50) ?? "Obligation",
        data: {
          priority: obl.priority,
          status: obl.status,
          risk: obl.compliance_risk,
          confidence: obl.confidence_score,
          regulation: obl.regulation,
          icon: "Scale",
        },
      });

      // Edge: document → obligation (use regulation as proxy to match doc)
      if (documents && documents.length > 0) {
        const matchDoc = documents.find((d) =>
          obl.regulation?.toLowerCase().includes(d.filename?.toLowerCase().replace(".pdf", "") ?? "XXX")
        ) ?? documents[0];
        if (matchDoc) {
          edges.push({
            id: `edge-doc-obl-${obl.id}`,
            source: `doc-${matchDoc.id}`,
            target: `obl-${obl.id}`,
            label: "generates",
          });
        }
      }

      // Edge: obligation → department
      if (obl.department) {
        edges.push({
          id: `edge-obl-dept-${obl.id}`,
          source: `obl-${obl.id}`,
          target: `dept-${obl.department}`,
          label: "owned by",
        });
      }
    });

    // MAP card nodes
    (mapCards ?? []).forEach((card) => {
      nodes.push({
        id: `map-${card.id}`,
        type: "map_action",
        label: card.title?.slice(0, 45) ?? "MAP Action",
        data: { status: card.status, priority: card.priority, icon: "GitBranch" },
      });

      // Edge: obligation → MAP action
      if (card.obligation_id) {
        edges.push({
          id: `edge-obl-map-${card.id}`,
          source: `obl-${card.obligation_id}`,
          target: `map-${card.id}`,
          label: "requires",
        });
      }
    });

    // Evidence nodes
    (evidence ?? []).forEach((ev) => {
      nodes.push({
        id: `ev-${ev.id}`,
        type: "evidence",
        label: ev.title?.slice(0, 40) ?? "Evidence",
        data: {
          collected: !!ev.collected_at,
          icon: "ShieldCheck",
        },
      });

      if (ev.obligation_id) {
        edges.push({
          id: `edge-ev-obl-${ev.id}`,
          source: `obl-${ev.obligation_id}`,
          target: `ev-${ev.id}`,
          label: "mitigated by",
        });
      }
    });

    return NextResponse.json({ nodes, edges, summary: { nodes: nodes.length, edges: edges.length } });
  } catch (err) {
    console.error("[knowledge-graph]", err);
    return NextResponse.json({ nodes: [], edges: [], summary: { nodes: 0, edges: 0 } });
  }
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}
