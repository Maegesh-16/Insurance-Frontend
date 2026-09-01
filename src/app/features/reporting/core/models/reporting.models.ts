export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  userId: number;
  email: string;
  roles: string[];
}

export interface OutputFormat {
  outputFormatId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ReportCategory {
  categoryId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ReportStatus {
  reportStatusId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ExecutionStatus {
  executionStatusId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ReportDefinition {
  reportDefinitionId: number;
  reportCode: string;
  reportName: string;
  categoryId: number;
  description?: string | null;
  defaultFormatId: number;
  isScheduledAllowed: boolean;
  isAdhocAllowed: boolean;
  isActive: boolean;
  category?: ReportCategory | null;
  defaultFormat?: OutputFormat | null;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface CreateReportDefinitionPayload {
  reportCode: string;
  reportName: string;
  categoryId: number;
  description?: string | null;
  defaultFormatId: number;
  isScheduledAllowed: boolean;
  isAdhocAllowed: boolean;
  isActive: boolean;
  createdBy?: number | null;
  correlationId?: string | null;
}

export interface ReportExecutionHistory {
  reportExecutionHistoryId: number;
  reportRequestId: number;
  startedAt: string;
  completedAt?: string | null;
  executionStatusId: number;
  recordsCount?: number | null;
  executionTimeMs?: number | null;
  workerName?: string | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
  correlationId?: string | null;
  executionStatus?: ExecutionStatus | null;
}

export interface ReportRequest {
  reportRequestId: number;
  reportCode: string;
  requestedByUserId: number;
  requestedAt: string;
  fromDate?: string | null;
  toDate?: string | null;
  parametersJson?: string | null;
  outputFormatId: number;
  reportStatusId: number;
  filePath?: string | null;
  fileName?: string | null;
  generatedAt?: string | null;
  failureReason?: string | null;
  expiresAt?: string | null;
  outputFormat?: OutputFormat | null;
  reportStatus?: ReportStatus | null;
  executionHistories: ReportExecutionHistory[];
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface CreateReportRequestPayload {
  reportCode: string;
  requestedByUserId: number;
  fromDate?: string | null;
  toDate?: string | null;
  parametersJson?: string | null;
  outputFormatId: number;
  reportStatusId: number;
  createdBy?: number | null;
  correlationId?: string | null;
}

export interface ReportSnapshot {
  reportSnapshotId: number;
  reportCode: string;
  snapshotDate: string;
  periodStartDate: string;
  periodEndDate: string;
  generatedAt: string;
  generatedByUserId?: number | null;
  summaryJson: string;
  versionLabel?: string | null;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface CreateReportSnapshotPayload {
  reportCode: string;
  snapshotDate: string;
  periodStartDate: string;
  periodEndDate: string;
  generatedAt: string;
  generatedByUserId?: number | null;
  summaryJson: string;
  versionLabel?: string | null;
  createdBy?: number | null;
  correlationId?: string | null;
}

export interface ScheduledReport {
  scheduledReportId: number;
  reportDefinitionId: number;
  scheduleName: string;
  cronExpression: string;
  outputFormatId: number;
  recipientsJson?: string | null;
  parametersJson?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  isActive: boolean;
  outputFormat?: OutputFormat | null;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface CreateScheduledReportPayload {
  reportDefinitionId: number;
  scheduleName: string;
  cronExpression: string;
  outputFormatId: number;
  recipientsJson?: string | null;
  parametersJson?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  isActive: boolean;
  createdBy?: number | null;
  correlationId?: string | null;
}

export interface DashboardMetric {
  dashboardMetricId: number;
  metricCode: string;
  metricName: string;
  metricDate: string;
  metricValue: number;
  metricUnit?: string | null;
  dimensionJson?: string | null;
  sourceService: string;
  calculatedAt: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface LookupBundle {
  outputFormats: OutputFormat[];
  reportCategories: ReportCategory[];
  reportStatuses: ReportStatus[];
  executionStatuses: ExecutionStatus[];
}

export interface ReportRequestFilters {
  requestedByUserId?: number | null;
  reportStatusId?: number | null;
  pendingOnly?: boolean;
}

export interface ScheduledReportFilters {
  activeOnly?: boolean;
  dueAt?: string | null;
}

export interface DashboardMetricFilters {
  metricCode?: string | null;
  metricDate?: string | null;
  sourceService?: string | null;
}