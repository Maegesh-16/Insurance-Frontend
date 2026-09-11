import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import {
  CreateReportDefinitionPayload,
  CreateReportRequestPayload,
  CreateReportSnapshotPayload,
  CreateScheduledReportPayload,
  DashboardMetric,
  DashboardMetricFilters,
  ExecutionStatus,
  LookupBundle,
  OutputFormat,
  ReportCategory,
  ReportDefinition,
  ReportExecutionHistory,
  ReportRequest,
  ReportRequestFilters,
  ReportSnapshot,
  ReportStatus,
  ScheduledReport,
  ScheduledReportFilters
} from '../models/reporting.models';

@Injectable({ providedIn: 'root' })
export class ReportingApiService {
  private readonly http = inject(HttpClient);
  private readonly reportingBaseUrl = '/reporting-api/api/reporting';

  getLookups(activeOnly = false): Observable<LookupBundle> {
    return forkJoin({
      outputFormats: this.getOutputFormats(activeOnly),
      reportCategories: this.getReportCategories(activeOnly),
      reportStatuses: this.getReportStatuses(activeOnly),
      executionStatuses: this.getExecutionStatuses(activeOnly)
    });
  }

  getOutputFormats(activeOnly = false): Observable<OutputFormat[]> {
    return this.http.get<OutputFormat[]>(`${this.reportingBaseUrl}/lookups/output-formats`, {
      params: this.lookupParams(activeOnly)
    });
  }

  getReportCategories(activeOnly = false): Observable<ReportCategory[]> {
    return this.http.get<ReportCategory[]>(`${this.reportingBaseUrl}/lookups/report-categories`, {
      params: this.lookupParams(activeOnly)
    });
  }

  getReportStatuses(activeOnly = false): Observable<ReportStatus[]> {
    return this.http.get<ReportStatus[]>(`${this.reportingBaseUrl}/lookups/report-statuses`, {
      params: this.lookupParams(activeOnly)
    });
  }

  getExecutionStatuses(activeOnly = false): Observable<ExecutionStatus[]> {
    return this.http.get<ExecutionStatus[]>(`${this.reportingBaseUrl}/lookups/execution-statuses`, {
      params: this.lookupParams(activeOnly)
    });
  }

  getReportDefinitions(activeOnly = false): Observable<ReportDefinition[]> {
    return this.http.get<ReportDefinition[]>(`${this.reportingBaseUrl}/report-definitions`, {
      params: activeOnly ? new HttpParams().set('activeOnly', true) : undefined
    });
  }

  createReportDefinition(payload: CreateReportDefinitionPayload): Observable<ReportDefinition> {
    return this.http.post<ReportDefinition>(`${this.reportingBaseUrl}/report-definitions`, payload);
  }

  getReportRequests(filters: ReportRequestFilters = {}): Observable<ReportRequest[]> {
    let params = new HttpParams();

    if (filters.requestedByUserId) {
      params = params.set('requestedByUserId', filters.requestedByUserId);
    }

    if (filters.reportStatusId) {
      params = params.set('reportStatusId', filters.reportStatusId);
    }

    if (filters.pendingOnly) {
      params = params.set('pendingOnly', true);
    }

    return this.http.get<ReportRequest[]>(`${this.reportingBaseUrl}/report-requests`, { params });
  }

  createReportRequest(payload: CreateReportRequestPayload): Observable<ReportRequest> {
    return this.http.post<ReportRequest>(`${this.reportingBaseUrl}/report-requests`, payload);
  }

  getReportExecutionHistories(reportRequestId?: number | null): Observable<ReportExecutionHistory[]> {
    const params = reportRequestId ? new HttpParams().set('reportRequestId', reportRequestId) : undefined;
    return this.http.get<ReportExecutionHistory[]>(`${this.reportingBaseUrl}/report-execution-histories`, { params });
  }

  getReportSnapshots(reportCode?: string | null): Observable<ReportSnapshot[]> {
    const params = reportCode ? new HttpParams().set('reportCode', reportCode) : undefined;
    return this.http.get<ReportSnapshot[]>(`${this.reportingBaseUrl}/report-snapshots`, { params });
  }

  getLatestReportSnapshot(reportCode: string): Observable<ReportSnapshot> {
    return this.http.get<ReportSnapshot>(`${this.reportingBaseUrl}/report-snapshots/by-code/${reportCode}/latest`);
  }

  getReportSnapshotByDate(reportCode: string, snapshotDate: string): Observable<ReportSnapshot> {
    return this.http.get<ReportSnapshot>(`${this.reportingBaseUrl}/report-snapshots/by-code/${reportCode}/by-date/${snapshotDate}`);
  }

  createReportSnapshot(payload: CreateReportSnapshotPayload): Observable<ReportSnapshot> {
    return this.http.post<ReportSnapshot>(`${this.reportingBaseUrl}/report-snapshots`, payload);
  }

  getScheduledReports(filters: ScheduledReportFilters = {}): Observable<ScheduledReport[]> {
    let params = new HttpParams();

    if (filters.activeOnly) {
      params = params.set('activeOnly', true);
    }

    if (filters.dueAt) {
      params = params.set('dueAt', filters.dueAt);
    }

    return this.http.get<ScheduledReport[]>(`${this.reportingBaseUrl}/scheduled-reports`, { params });
  }

  createScheduledReport(payload: CreateScheduledReportPayload): Observable<ScheduledReport> {
    return this.http.post<ScheduledReport>(`${this.reportingBaseUrl}/scheduled-reports`, payload);
  }

  getDashboardMetrics(filters: DashboardMetricFilters = {}): Observable<DashboardMetric[]> {
    let params = new HttpParams();

    if (filters.metricCode) {
      params = params.set('metricCode', filters.metricCode);
    }

    if (filters.metricDate) {
      params = params.set('metricDate', filters.metricDate);
    }

    if (filters.sourceService) {
      params = params.set('sourceService', filters.sourceService);
    }

    return this.http.get<DashboardMetric[]>(`${this.reportingBaseUrl}/dashboard-metrics`, { params });
  }

  private lookupParams(activeOnly: boolean): HttpParams | undefined {
    return activeOnly ? new HttpParams().set('activeOnly', true) : undefined;
  }
}