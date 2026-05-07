"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, StatusBadge } from "@/components/ui/glass-card";
import { useMapBoard } from "@/hooks/use-map-board";
import { CardSkeleton, ErrorState } from "@/components/ui/loading-states";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MAPCard as MAPCardType, MAPColumn } from "@/types";
import {
  Calendar, MessageSquare, AlertTriangle, User, Plus, MoreHorizontal,
  X, Save, Loader2, Trash2, Edit2, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEPT_OPTIONS = ["Compliance","Finance","IT","Risk","Legal","Operations","HR","Audit"];

// ── Card Create/Edit Modal ────────────────────────────────────────────────────
interface CardForm { title: string; owner: string; due_date: string; priority: string; description: string; }
interface CardModalProps { open: boolean; onClose: () => void; onSave: () => void; editId?: string | null; columnId?: string; initialData?: Partial<CardForm>; }

function CardModal({ open, onClose, onSave, editId, columnId, initialData }: CardModalProps) {
  const isEdit = Boolean(editId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CardForm>({
    title: "", owner: "Compliance Team", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    priority: "medium", description: "", ...initialData,
  });
  const set = (f: keyof CardForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/map-cards/${editId}` : "/api/map-cards";
      const body = isEdit ? form : { ...form, status: columnId ?? "backlog" };
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      toast.success(isEdit ? "MAP card updated" : "MAP card created");
      onSave(); onClose();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-lg bg-[#0a1929] border border-[#424655]/40 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-base font-semibold text-[#d4e4fa]">{isEdit ? "Edit MAP Card" : "New MAP Card"}</h2>
              <button onClick={onClose} className="text-[#8c90a1] hover:text-[#d4e4fa]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8c90a1] uppercase tracking-wider mb-1.5">Title *</label>
                <Input value={form.title} onChange={set("title")} placeholder="e.g. Submit Q1 Capital Report" className="bg-[#0d1c2d] border-[#424655]/30 text-[#d4e4fa]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8c90a1] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Additional notes..." className="w-full rounded-lg bg-[#0d1c2d] border border-[#424655]/30 text-[#d4e4fa] text-sm px-3 py-2 placeholder:text-[#8c90a1]/60 focus:outline-none focus:border-[#b0c6ff]/40 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8c90a1] uppercase tracking-wider mb-1.5">Owner</label>
                  <Input value={form.owner} onChange={set("owner")} placeholder="e.g. John Smith" className="bg-[#0d1c2d] border-[#424655]/30 text-[#d4e4fa]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8c90a1] uppercase tracking-wider mb-1.5">Due Date</label>
                  <Input type="date" value={form.due_date} onChange={set("due_date")} className="bg-[#0d1c2d] border-[#424655]/30 text-[#d4e4fa]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8c90a1] uppercase tracking-wider mb-1.5">Priority</label>
                <select value={form.priority} onChange={set("priority")} className="w-full rounded-lg bg-[#0d1c2d] border border-[#424655]/30 text-[#d4e4fa] text-sm px-3 py-2 focus:outline-none focus:border-[#b0c6ff]/40">
                  {["critical","high","medium","low"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#8c90a1] hover:text-[#d4e4fa]">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#b0c6ff] text-[#002d6f] text-sm font-semibold hover:bg-[#b0c6ff]/90 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEdit ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── MAP Card Component ────────────────────────────────────────────────────────
const priorityColors: Record<string, string> = { high: "border-l-red-400", medium: "border-l-amber-400", low: "border-l-slate-400", critical: "border-l-red-500" };

function MAPCardItem({ card, index, onEdit, onDelete, onDragStart, onDragEnd }: {
  card: MAPCardType; index: number;
  onEdit: (c: MAPCardType) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string, fromCol: string) => void;
  onDragEnd: () => void;
}) {
  const completedEvidence = card.evidence.filter(e => e.completed).length;
  const totalEvidence = card.evidence.length;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, card.id, card.status)}
      onDragEnd={onDragEnd}
      className={cn("bg-[#0d1c2d]/80 rounded-lg p-4 border border-[#424655]/20 hover:border-[#b0c6ff]/20 transition-all cursor-grab active:cursor-grabbing border-l-2 group", priorityColors[card.priority] ?? "border-l-slate-400")}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-[#d4e4fa] leading-tight pr-2 flex-1">{card.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(card)} className="p-1 rounded text-[#8c90a1] hover:text-[#b0c6ff] hover:bg-[#273647]/50"><Edit2 className="w-3 h-3" /></button>
          <button onClick={() => onDelete(card.id)} className="p-1 rounded text-[#8c90a1] hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></button>
          {card.escalated && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
        </div>
      </div>
      <p className="text-[11px] text-[#8c90a1] font-mono mb-3 truncate">{card.obligation ?? "—"}</p>
      {totalEvidence > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8c90a1] font-semibold">Evidence</span>
            <span className="text-xs text-[#8c90a1]">{completedEvidence}/{totalEvidence}</span>
          </div>
          <div className="flex gap-1">
            {card.evidence.map(ev => (
              <div key={ev.id} className={cn("h-1.5 flex-1 rounded-full", ev.completed ? "bg-emerald-400" : "bg-[#273647]")} />
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#8c90a1]">
            <User className="w-3 h-3" /><span className="text-[11px]">{card.owner.split(" ")[0]}</span>
          </div>
          <div className="flex items-center gap-1 text-[#8c90a1]">
            <Calendar className="w-3 h-3" />
            <span className="text-[11px]">{new Date(card.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#8c90a1]">
          <MessageSquare className="w-3 h-3" /><span className="text-[11px]">{card.comments}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MapBoardPage() {
  const { columns, isLoading, error, refetch, updateCardStatus } = useMapBoard();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCard, setEditCard] = useState<MAPCardType | null>(null);
  const [newCardColumn, setNewCardColumn] = useState<string>("backlog");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drag state
  const dragCardId = useRef<string | null>(null);
  const dragFromCol = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const columnColors: Record<string, string> = {
    backlog: "text-slate-400",
    "in-progress": "text-[#b0c6ff]",
    review: "text-amber-400",
    completed: "text-emerald-400",
  };
  const columnDotColors: Record<string, string> = {
    backlog: "bg-slate-400",
    "in-progress": "bg-[#b0c6ff]",
    review: "bg-amber-400",
    completed: "bg-emerald-400",
  };

  const onDragStart = useCallback((_e: React.DragEvent, cardId: string, fromCol: string) => {
    dragCardId.current = cardId;
    dragFromCol.current = fromCol;
  }, []);

  const onDragEnd = useCallback(() => {
    dragCardId.current = null;
    dragFromCol.current = null;
    setDragOverCol(null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const cardId = dragCardId.current;
    const fromCol = dragFromCol.current;
    if (!cardId || fromCol === targetCol) return;
    const { error } = await updateCardStatus(cardId, targetCol as MAPCardType["status"]);
    if (error) toast.error(error);
    else toast.success("Card moved");
  }, [updateCardStatus]);

  const openNewCard = (columnId: string) => {
    setEditCard(null);
    setNewCardColumn(columnId);
    setModalOpen(true);
  };

  const openEditCard = (card: MAPCardType) => {
    setEditCard(card);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this MAP card?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/map-cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("MAP card deleted");
      refetch();
    } catch (err) { toast.error((err as Error).message); }
    finally { setDeletingId(null); }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="MAP Board" description="Management Action Plans — track remediation workflows from obligation to evidence." />
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0);
  const completedCards = columns.find(c => c.id === "completed")?.cards.length ?? 0;

  return (
    <>
      <CardModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCard(null); }}
        onSave={refetch}
        editId={editCard?.id}
        columnId={newCardColumn}
        initialData={editCard ? { title: editCard.title, owner: editCard.owner, due_date: editCard.dueDate, priority: editCard.priority } : undefined}
      />

      <div className="space-y-6">
        <PageHeader
          title="MAP Board"
          description="Management Action Plans — drag cards between columns to track remediation workflows."
          actions={
            <div className="flex items-center gap-2">
              <div className="text-xs text-[#8c90a1] px-3 py-1.5 rounded-lg bg-[#273647]/40 border border-[#424655]/30">
                {completedCards}/{totalCards} completed
              </div>
              <button onClick={() => openNewCard("backlog")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#b0c6ff] text-[#002d6f] hover:bg-[#b0c6ff]/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> New MAP
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 pb-6">
          {columns.map(column => (
            <div key={column.id} className="flex flex-col"
              onDragOver={e => onDragOver(e, column.id)}
              onDrop={e => onDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", columnDotColors[column.id])} />
                  <h3 className={cn("text-sm font-semibold", columnColors[column.id])}>{column.title}</h3>
                  <span className="text-xs text-[#8c90a1] bg-[#273647]/50 rounded-full px-2 py-0.5">{column.cards.length}</span>
                </div>
                <button onClick={() => openNewCard(column.id)} className="text-[#8c90a1] hover:text-[#d4e4fa] transition-colors p-1 rounded hover:bg-[#273647]/50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className={cn(
                "space-y-3 min-h-[200px] rounded-xl p-3 border transition-all duration-150",
                dragOverCol === column.id
                  ? "bg-[#b0c6ff]/[0.04] border-[#b0c6ff]/30"
                  : "bg-[#051424]/30 border-[#424655]/10"
              )}>
                {isLoading ? (
                  <><CardSkeleton /><CardSkeleton /></>
                ) : (
                  <>
                    {column.cards.map((card, i) => (
                      <MAPCardItem
                        key={card.id}
                        card={card}
                        index={i}
                        onEdit={openEditCard}
                        onDelete={handleDelete}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                    {column.cards.length === 0 && (
                      <div className="py-6 text-center text-xs text-[#8c90a1]/50 italic">
                        Drop cards here
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => openNewCard(column.id)}
                  className="w-full py-2.5 rounded-lg border border-dashed border-[#424655]/30 text-[#8c90a1] text-xs hover:border-[#b0c6ff]/30 hover:text-[#b0c6ff] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
