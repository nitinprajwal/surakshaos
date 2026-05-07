"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { KPIMetric, ActivityItem, RiskScore, ComplianceTrend } from "@/types";

interface DashboardKPIs {
  total_obligations: number;
  compliance_score: number;
  pending_maps: number;
  docs_processed: number;
  overdue_count: number;
  high_risk_count: number;
}

interface DashboardData {
  kpis: KPIMetric[];
  recentActivity: ActivityItem[];
  riskScores: RiskScore[];
  complianceTrends: ComplianceTrend[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): DashboardData {
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [complianceTrends, setComplianceTrends] = useState<ComplianceTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch KPIs via RPC, fall back to direct queries if RPC doesn't exist
      let kpiResult: DashboardKPIs;
      const { data: kpiData, error: kpiError } = await supabase.rpc("get_dashboard_kpis");

      if (kpiError) {
        // Fallback: compute KPIs manually
        const [oblRes, docsRes, mapsRes] = await Promise.all([
          supabase.from("obligations").select("id, status, priority"),
          supabase.from("documents").select("id, status"),
          supabase.from("map_cards").select("id, status, priority"),
        ]);
        const obls = (oblRes.data ?? []) as { id: string; status: string; priority: string }[];
        const docs = (docsRes.data ?? []) as { id: string; status: string }[];
        const maps = (mapsRes.data ?? []) as { id: string; status: string; priority: string }[];
        const total = obls.length;
        const compliant = obls.filter(o => o.status === "compliant").length;
        const overdue = obls.filter(o => o.status === "overdue").length;
        const highRisk = obls.filter(o => o.priority === "critical" || o.priority === "high").length;
        const pendingMaps = maps.filter(m => m.status !== "completed").length;
        const docsProcessed = docs.filter(d => d.status === "processed").length;
        kpiResult = {
          total_obligations: total,
          compliance_score: total > 0 ? Math.round((compliant / total) * 100) : 0,
          overdue_count: overdue,
          high_risk_count: highRisk,
          pending_maps: pendingMaps,
          docs_processed: docsProcessed,
        };
      } else {
        kpiResult = (typeof kpiData === "string" ? JSON.parse(kpiData) : kpiData) as DashboardKPIs;
      }

      setKpis([
        {
          title: "Total Obligations",
          value: kpiResult.total_obligations.toLocaleString(),
          change: `${kpiResult.overdue_count} overdue`,
          changeType: kpiResult.overdue_count > 0 ? "negative" : "positive",
          icon: "Scale",
        },
        {
          title: "Compliance Score",
          value: `${kpiResult.compliance_score.toFixed(1)}%`,
          change: kpiResult.compliance_score >= 90 ? "Above threshold" : "Below threshold",
          changeType: kpiResult.compliance_score >= 90 ? "positive" : "negative",
          icon: "ShieldCheck",
        },
        {
          title: "Pending MAPs",
          value: kpiResult.pending_maps.toString(),
          change: `${kpiResult.high_risk_count} high risk`,
          changeType: kpiResult.high_risk_count > 0 ? "negative" : "positive",
          icon: "GitBranch",
        },
        {
          title: "Documents Processed",
          value: kpiResult.docs_processed.toString(),
          change: "All time",
          changeType: "positive",
          icon: "FileText",
        },
      ]);

      // Fetch recent activity
      const { data: activityData, error: activityError } = await supabase
        .from("audit_trail")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (activityError) throw new Error(activityError.message);

      setRecentActivity(
        (activityData ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          actor: row.actor as string,
          action: row.details as string,
          target: row.target as string,
          timestamp: formatRelativeTime(row.created_at as string),
          type: mapAuditActionToActivityType(row.action as string),
        }))
      );

      // Fetch risk scores
      const { data: riskData, error: riskError } = await supabase
        .from("risk_scores")
        .select("*")
        .order("score", { ascending: true });

      if (riskError) throw new Error(riskError.message);

      setRiskScores(
        (riskData ?? []).map((row: Record<string, unknown>) => ({
          department: row.department as string,
          score: row.score as number,
          trend: row.trend as "up" | "down" | "stable",
          overdueCount: row.overdue_count as number,
        }))
      );

      // Fetch compliance trends
      const { data: trendData, error: trendError } = await supabase
        .from("compliance_trends")
        .select("*")
        .order("recorded_at", { ascending: true });

      if (trendError) throw new Error(trendError.message);

      setComplianceTrends(
        (trendData ?? []).map((row: Record<string, unknown>) => ({
          month: row.month as string,
          score: row.score as number,
          obligations: row.obligations as number,
          resolved: row.resolved as number,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: re-fetch on changes to key tables (debounced to avoid hammering the DB)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { fetchAll(); }, 2000);
    };

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "obligations" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "map_cards" }, debouncedFetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_trail" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "risk_scores" }, debouncedFetch)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchAll]);

  return { kpis, recentActivity, riskScores, complianceTrends, isLoading, error, refetch: fetchAll };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function mapAuditActionToActivityType(action: string): ActivityItem["type"] {
  if (action.includes("upload")) return "upload";
  if (action.includes("process") || action.includes("extract")) return "extraction";
  if (action.includes("review") || action.includes("closed")) return "approval";
  if (action.includes("risk") || action.includes("alert")) return "escalation";
  return "review";
}
