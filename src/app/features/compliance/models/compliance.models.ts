export type CompliancePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ComplianceAlert {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: CompliancePriority | string;
  sourceModule: string;
  relatedCustomerId?: string | null;
  relatedPolicyId?: string | null;
  relatedClaimId?: string | null;
  createdAtUtc: string;
  reviewedAtUtc?: string | null;
}

export interface ComplianceCase {
  id: string;
  reference: string;
  title: string;
  reason: string;
  status: string;
  priority: CompliancePriority | string;
  relatedCustomerId?: string | null;
  relatedPolicyId?: string | null;
  relatedClaimId?: string | null;
  openedAtUtc: string;
  resolvedAtUtc?: string | null;
  assignedTo?: string | null;
}

export interface ComplianceCaseDetail extends ComplianceCase {
  notes: ComplianceCaseNote[];
  activity: ComplianceCaseActivity[];
}

export interface ComplianceCaseNote {
  id: string;
  content: string;
  author: string;
  createdAtUtc: string;
}

export interface ComplianceCaseActivity {
  id: string;
  action: string;
  details?: string | null;
  actor: string;
  occurredAtUtc: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  module: string;
  status: string;
  details?: string | null;
  occurredAtUtc: string;
}

export interface ComplianceDashboard {
  totalAlerts: number;
  openCases: number;
  highPriorityCases: number;
  recentlyResolvedCases: number;
  recentActivity: ComplianceCaseActivity[];
}

export interface ComplianceReportSummary {
  openCases: number;
  resolvedCases: number;
  casesByPriority: { priority: string; count: number }[];
  alertsByStatus: { status: string; count: number }[];
  recentActivity: ComplianceCaseActivity[];
}
