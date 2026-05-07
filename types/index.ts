// Navigation Types
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
}

// Dashboard Types
export interface KPIMetric {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

export interface ComplianceScore {
  category: string;
  score: number;
  maxScore: number;
  status: "healthy" | "warning" | "critical";
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  type: "upload" | "approval" | "extraction" | "escalation" | "review";
}

// Upload Types
export interface UploadFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number;
  obligationsFound?: number;
  confidence?: number;
  timestamp: string;
}

// Obligations Types
export interface Obligation {
  id: string;
  title: string;
  source: string;
  regulator: string;
  department: string;
  status: "active" | "pending" | "overdue" | "completed";
  confidence: number;
  dueDate: string;
  priority: "high" | "medium" | "low";
  citations: string[];
}

// MAP Board Types
export interface MAPCard {
  id: string;
  title: string;
  obligation: string;
  owner: string;
  dueDate: string;
  status: "backlog" | "in-progress" | "review" | "completed";
  priority: "high" | "medium" | "low";
  evidence: EvidenceItem[];
  comments: number;
  escalated: boolean;
}

export interface EvidenceItem {
  id: string;
  title: string;
  completed: boolean;
}

export type MAPColumn = {
  id: string;
  title: string;
  cards: MAPCard[];
};

// Audit Types
export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  type: "approval" | "upload" | "extraction" | "escalation" | "modification" | "review";
  metadata?: Record<string, string>;
}

// Risk Analytics Types
export interface RiskScore {
  department: string;
  score: number;
  trend: "up" | "down" | "stable";
  overdueCount: number;
}

export interface ComplianceTrend {
  month: string;
  score: number;
  obligations: number;
  resolved: number;
}

// Settings Types
export interface SettingsSection {
  id: string;
  title: string;
  description: string;
}
