"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MAPCard, MAPColumn, EvidenceItem } from "@/types";

interface UseMapBoardResult {
  columns: MAPColumn[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateCardStatus: (cardId: string, newStatus: MAPCard["status"]) => Promise<{ error: string | null }>;
}

const STATUS_ORDER: MAPCard["status"][] = ["backlog", "in-progress", "review", "completed"];
const STATUS_TITLES: Record<string, string> = {
  backlog: "Backlog",
  "in-progress": "In Progress",
  review: "Under Review",
  completed: "Completed",
};

// Map DB enum values to UI status values
function dbStatusToUI(status: string): MAPCard["status"] {
  switch (status) {
    case "backlog": return "backlog";
    case "in_progress": return "in-progress";
    case "review": return "review";
    case "completed": return "completed";
    default: return "backlog";
  }
}

function uiStatusToDB(status: MAPCard["status"]): string {
  switch (status) {
    case "backlog": return "backlog";
    case "in-progress": return "in_progress";
    case "review": return "review";
    case "completed": return "completed";
    default: return "backlog";
  }
}

export function useMapBoard(): UseMapBoardResult {
  const [columns, setColumns] = useState<MAPColumn[]>(
    STATUS_ORDER.map((s) => ({ id: s, title: STATUS_TITLES[s], cards: [] }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMapBoard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch map cards
    const { data: cards, error: cardsError } = await supabase
      .from("map_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (cardsError) {
      setError(cardsError.message);
      setIsLoading(false);
      return;
    }

    // Fetch evidence for all obligations referenced by map cards
    const obligationIds = (cards ?? []).map((c: Record<string, unknown>) => c.obligation_id as string).filter(Boolean);
    
    let evidenceByObligation: Record<string, EvidenceItem[]> = {};
    
    if (obligationIds.length > 0) {
      const { data: evidenceData } = await supabase
        .from("evidence")
        .select("*")
        .in("obligation_id", obligationIds);

      if (evidenceData) {
        for (const ev of evidenceData as Record<string, unknown>[]) {
          const oblId = ev.obligation_id as string;
          if (!evidenceByObligation[oblId]) evidenceByObligation[oblId] = [];
          evidenceByObligation[oblId].push({
            id: ev.id as string,
            title: ev.title as string,
            completed: (ev.collected_at as string | null) !== null,
          });
        }
      }
    }

    // Build columns
    const newColumns: MAPColumn[] = STATUS_ORDER.map((status) => ({
      id: status,
      title: STATUS_TITLES[status],
      cards: (cards ?? [])
        .filter((c: Record<string, unknown>) => dbStatusToUI(c.status as string) === status)
        .map((c: Record<string, unknown>): MAPCard => ({
          id: c.id as string,
          title: c.title as string,
          obligation: c.obligation_id as string,
          owner: c.owner as string,
          dueDate: c.due_date as string,
          status: dbStatusToUI(c.status as string),
          priority: mapPriority(c.priority as string),
          evidence: evidenceByObligation[c.obligation_id as string] ?? [],
          comments: c.comments_count as number,
          escalated: c.escalated as boolean,
        })),
    }));

    setColumns(newColumns);
    setIsLoading(false);
  }, []);

  // Optimistic status update
  const updateCardStatus = useCallback(
    async (cardId: string, newStatus: MAPCard["status"]): Promise<{ error: string | null }> => {
      // Find current card
      let originalCard: MAPCard | undefined;
      let originalColId: string | undefined;

      for (const col of columns) {
        const found = col.cards.find((c) => c.id === cardId);
        if (found) {
          originalCard = found;
          originalColId = col.id;
          break;
        }
      }

      if (!originalCard || !originalColId) return { error: "Card not found" };

      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === originalColId) {
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
          }
          if (col.id === newStatus) {
            return { ...col, cards: [...col.cards, { ...originalCard!, status: newStatus }] };
          }
          return col;
        })
      );

      // Persist
      const { error: dbError } = await supabase
        .from("map_cards")
        .update({ status: uiStatusToDB(newStatus) })
        .eq("id", cardId);

      if (dbError) {
        // Rollback
        setColumns((prev) =>
          prev.map((col) => {
            if (col.id === newStatus) {
              return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
            }
            if (col.id === originalColId) {
              return { ...col, cards: [...col.cards, originalCard!] };
            }
            return col;
          })
        );
        return { error: dbError.message };
      }

      return { error: null };
    },
    [columns]
  );

  useEffect(() => {
    fetchMapBoard();
  }, [fetchMapBoard]);

  useEffect(() => {
    const channel = supabase
      .channel("map-board-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "map_cards" }, () => {
        fetchMapBoard();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, () => {
        fetchMapBoard();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchMapBoard]);

  return { columns, isLoading, error, refetch: fetchMapBoard, updateCardStatus };
}

function mapPriority(priority: string): MAPCard["priority"] {
  if (priority === "critical" || priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}
