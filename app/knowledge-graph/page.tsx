"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, GlassCard } from "@/components/ui/glass-card";
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, MarkerType, type Node, type Edge, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FileText, Scale, Building2, GitBranch, ShieldCheck, RefreshCw, Filter, Layers, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Node type colors ───────────────────────────────────────────────────────
const NODE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; glow: string }> = {
  document:    { bg: "#0d2236", border: "#3b82f6", text: "#93c5fd", icon: FileText,    glow: "shadow-[0_0_12px_rgba(59,130,246,0.4)]" },
  obligation:  { bg: "#0d1f0d", border: "#4ade80", text: "#86efac", icon: Scale,       glow: "shadow-[0_0_12px_rgba(74,222,128,0.35)]" },
  department:  { bg: "#1a1028", border: "#a78bfa", text: "#c4b5fd", icon: Building2,   glow: "shadow-[0_0_12px_rgba(167,139,250,0.35)]" },
  map_action:  { bg: "#1c1107", border: "#fbbf24", text: "#fde68a", icon: GitBranch,   glow: "shadow-[0_0_12px_rgba(251,191,36,0.35)]" },
  evidence:    { bg: "#0e1a1a", border: "#2dd4bf", text: "#99f6e4", icon: ShieldCheck, glow: "shadow-[0_0_12px_rgba(45,212,191,0.35)]" },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#fbbf24", low: "#4ade80",
};

// ── Custom Node Component ──────────────────────────────────────────────────
function ComplianceNode({ data }: { data: Record<string, unknown> }) {
  const style = NODE_STYLES[data.nodeType as string] ?? NODE_STYLES.document;
  const Icon = style.icon;
  const priority = data.priority as string | undefined;

  return (
    <div className={cn("rounded-xl border px-3 py-2.5 min-w-[140px] max-w-[200px] cursor-pointer transition-all duration-200 hover:scale-105", style.glow)}
      style={{ background: style.bg, borderColor: style.border }}>
      <Handle type="target" position={Position.Left} style={{ background: style.border, width: 8, height: 8, border: "none" }} />
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: style.text }} />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: style.text }}>
            {(data.nodeType as string).replace("_", " ")}
          </p>
          <p className="text-[11px] text-white/90 leading-tight font-medium break-words">{data.label as string}</p>
          {priority && (
            <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase" style={{ color: PRIORITY_COLOR[priority] ?? "#fff", background: (PRIORITY_COLOR[priority] ?? "#fff") + "22" }}>
              {priority}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: style.border, width: 8, height: 8, border: "none" }} />
    </div>
  );
}

const nodeTypes = { complianceNode: ComplianceNode };

// ── Layout helpers ─────────────────────────────────────────────────────────
interface RawNode { id: string; type: string; label: string; data: Record<string, unknown> }
interface RawEdge { id: string; source: string; target: string; label: string }

function buildLayout(rawNodes: RawNode[], rawEdges: RawEdge[]): { nodes: Node[]; edges: Edge[] } {
  const TYPE_ORDER = ["document", "obligation", "department", "map_action", "evidence"];
  const colW = 280;
  const rowH = 110;

  const groups: Record<string, RawNode[]> = {};
  rawNodes.forEach((n) => {
    if (!groups[n.type]) groups[n.type] = [];
    groups[n.type].push(n);
  });

  const flowNodes: Node[] = [];
  TYPE_ORDER.forEach((type, colIdx) => {
    const group = groups[type] ?? [];
    group.forEach((n, rowIdx) => {
      flowNodes.push({
        id: n.id,
        type: "complianceNode",
        position: { x: colIdx * colW + (colIdx % 2 === 0 ? 0 : 30), y: rowIdx * rowH + (colIdx * 40) },
        data: { ...n.data, label: n.label, nodeType: n.type },
      });
    });
  });

  const flowEdges: Edge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#424655", strokeWidth: 1.5 },
    labelStyle: { fill: "#8c90a1", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#424655", width: 14, height: 14 },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

// ── Filter panel ───────────────────────────────────────────────────────────
const FILTER_TYPES = [
  { key: "document",   label: "Documents",  color: "#3b82f6" },
  { key: "obligation", label: "Obligations",color: "#4ade80" },
  { key: "department", label: "Departments",color: "#a78bfa" },
  { key: "map_action", label: "MAP Actions",color: "#fbbf24" },
  { key: "evidence",   label: "Evidence",   color: "#2dd4bf" },
];

// ── Main page ──────────────────────────────────────────────────────────────
export default function KnowledgeGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(FILTER_TYPES.map(f => f.key)));
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const rawRef = useRef<{ nodes: RawNode[]; edges: RawEdge[] }>({ nodes: [], edges: [] });

  const applyFilters = useCallback((raw: { nodes: RawNode[]; edges: RawEdge[] }, filters: Set<string>) => {
    const filtered = raw.nodes.filter(n => filters.has(n.type));
    const filteredIds = new Set(filtered.map(n => n.id));
    const filteredEdges = raw.edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target));
    const { nodes: fn, edges: fe } = buildLayout(filtered, filteredEdges);
    setNodes(fn);
    setEdges(fe);
  }, [setNodes, setEdges]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge-graph");
      const data = await res.json();
      rawRef.current = { nodes: data.nodes ?? [], edges: data.edges ?? [] };
      setStats(data.summary ?? { nodes: 0, edges: 0 });
      applyFilters(rawRef.current, activeFilters);
    } catch {
      toast.error("Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  }, [activeFilters, applyFilters]);

  useEffect(() => { fetchGraph(); }, []);

  const toggleFilter = (key: string) => {
    const next = new Set(activeFilters);
    if (next.has(key)) { if (next.size > 1) next.delete(key); }
    else next.add(key);
    setActiveFilters(next);
    applyFilters(rawRef.current, next);
  };

  return (
    <div className="space-y-5 h-full">
      <PageHeader
        title="Compliance Knowledge Graph"
        description="Visual relationship map between regulations, obligations, departments, and evidence."
        actions={
          <button onClick={fetchGraph} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#273647]/40 border border-[#424655]/30 text-[#d4e4fa] hover:border-[#b0c6ff]/30 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh Graph
          </button>
        }
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FILTER_TYPES.map((f) => {
          const count = rawRef.current.nodes.filter(n => n.type === f.key).length;
          const isActive = activeFilters.has(f.key);
          return (
            <motion.button
              key={f.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleFilter(f.key)}
              className={cn("p-3 rounded-xl border text-left transition-all", isActive ? "border-opacity-60" : "border-[#424655]/20 opacity-40")}
              style={{ background: f.color + "12", borderColor: f.color + (isActive ? "60" : "20") }}
            >
              <div className="text-lg font-bold mb-0.5" style={{ color: f.color }}>{count}</div>
              <div className="text-[11px] text-[#8c90a1]">{f.label}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Graph container */}
      <GlassCard className="p-0 overflow-hidden" style={{ height: "62vh" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full flex-col gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
              <Layers className="w-8 h-8 text-[#b0c6ff]" />
            </motion.div>
            <p className="text-sm text-[#8c90a1]">Building knowledge graph...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-3 text-[#8c90a1]">
            <ZoomIn className="w-10 h-10 opacity-40" />
            <p className="text-sm">No data yet — upload documents to populate the graph.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
            minZoom={0.2}
            maxZoom={2}
            style={{ background: "transparent" }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#273647" gap={24} size={1} />
            <Controls style={{ background: "#0a1929", border: "1px solid #424655", borderRadius: "8px" }} />
            <MiniMap
              style={{ background: "#0a1929", border: "1px solid #424655", borderRadius: "8px" }}
              nodeColor={(n) => {
                const type = (n.data?.nodeType as string) ?? "document";
                return NODE_STYLES[type]?.border ?? "#424655";
              }}
            />
          </ReactFlow>
        )}
      </GlassCard>

      {/* Node detail drawer */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed right-6 top-24 w-72 z-40"
        >
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#d4e4fa]">Node Details</h4>
              <button onClick={() => setSelectedNode(null)} className="text-[#8c90a1] hover:text-[#d4e4fa] text-xs px-2 py-1 rounded bg-[#273647]/40">✕</button>
            </div>
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] uppercase text-[#8c90a1] font-semibold tracking-wider">Type</span>
                <p className="text-sm text-[#d4e4fa] mt-0.5 capitalize">{(selectedNode.data?.nodeType as string)?.replace("_", " ")}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#8c90a1] font-semibold tracking-wider">Label</span>
                <p className="text-sm text-[#d4e4fa] mt-0.5">{selectedNode.data?.label as string}</p>
              </div>
              {Boolean(selectedNode.data?.priority) && (
                <div>
                  <span className="text-[10px] uppercase text-[#8c90a1] font-semibold tracking-wider">Priority</span>
                  <p className="text-sm mt-0.5 capitalize font-semibold" style={{ color: PRIORITY_COLOR[String(selectedNode.data.priority)] ?? "#fff" }}>
                    {String(selectedNode.data.priority)}
                  </p>
                </div>
              )}
              {Boolean(selectedNode.data?.status) && (
                <div>
                  <span className="text-[10px] uppercase text-[#8c90a1] font-semibold tracking-wider">Status</span>
                  <p className="text-sm text-[#d4e4fa] mt-0.5 capitalize">{String(selectedNode.data.status).replace("_", " ")}</p>
                </div>
              )}
              {Boolean(selectedNode.data?.confidence) && (
                <div>
                  <span className="text-[10px] uppercase text-[#8c90a1] font-semibold tracking-wider">AI Confidence</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-[#273647]">
                      <div className="h-full rounded-full bg-[#b0c6ff]" style={{ width: `${Number(selectedNode.data.confidence)}%` }} />
                    </div>
                    <span className="text-xs text-[#8c90a1]">{Number(selectedNode.data.confidence)}%</span>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-[#8c90a1]" />
        <span className="text-xs text-[#8c90a1]">Click node type badges above to filter · Click nodes to inspect · Scroll to zoom · Drag to pan</span>
      </div>
    </div>
  );
}
