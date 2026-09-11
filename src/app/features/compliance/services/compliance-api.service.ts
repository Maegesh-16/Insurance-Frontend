import { inject, Injectable } from '@angular/core';
import { Observable, forkJoin, map, throwError } from 'rxjs';
import { AdministrationService } from '../../identity/services/administration.service';
import { NotificationService } from '../../notification/services/notification.service';
import { PolicyService } from '../../policy/services/policy.service';
import { ReportingApiService } from '../../reporting/core/services/reporting-api.service';
import { ClaimDetail, ClaimSummary } from '../../claim/models/claim.models';
import { ClaimApiService } from '../../claim/services/claim-api.service';
import {
  AuditLogEntry,
  ComplianceAlert,
  ComplianceCase,
  ComplianceCaseDetail,
  ComplianceDashboard,
  ComplianceReportSummary
} from '../models/compliance.models';

@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private readonly claimApi = inject(ClaimApiService);
  private readonly policyService = inject(PolicyService);
  private readonly notificationService = inject(NotificationService);
  private readonly administrationService = inject(AdministrationService);
  private readonly reportingApi = inject(ReportingApiService);

  getDashboard(): Observable<ComplianceDashboard> {
    return forkJoin({ alerts: this.getAlerts(), cases: this.getCases() }).pipe(map(({ alerts, cases }) => ({
      totalAlerts: alerts.length,
      openCases: cases.filter((caseItem) => this.isOpen(caseItem.status)).length,
      highPriorityCases: cases.filter((caseItem) => ['high', 'critical'].includes(caseItem.priority.toLowerCase())).length,
      recentlyResolvedCases: cases.filter((caseItem) => ['resolved', 'settled', 'closed'].some((status) => caseItem.status.toLowerCase().includes(status))).length,
      recentActivity: cases.slice().sort((first, second) => second.openedAtUtc.localeCompare(first.openedAtUtc)).slice(0, 6).map((caseItem) => ({
        id: caseItem.id,
        action: `${caseItem.status} claim record`,
        details: `${caseItem.reference} · ${caseItem.title}`,
        actor: caseItem.assignedTo || 'Claims service',
        occurredAtUtc: caseItem.openedAtUtc
      }))
    })));
  }

  getAlerts(status?: string, priority?: string): Observable<ComplianceAlert[]> {
    return this.claimApi.getClaims().pipe(map((claims) => [
      ...claims.filter((claim) => ['high', 'critical'].includes(claim.priorityName.toLowerCase())).map((claim) => this.claimAlert(claim)),
    ].filter((alert) => (status === undefined || status === 'All' || alert.status === status) && (priority === undefined || priority === 'All' || alert.priority === priority))));
  }

  getCases(search?: string, status?: string, priority?: string): Observable<ComplianceCase[]> {
    const query = search?.trim().toLowerCase();
    return this.claimApi.getClaims().pipe(map((claims) => claims.map((claim) => this.toCase(claim)).filter((caseItem) =>
      (!query || `${caseItem.reference} ${caseItem.title} ${caseItem.relatedPolicyId}`.toLowerCase().includes(query)) &&
      (status === undefined || status === 'All' || caseItem.status === status) &&
      (priority === undefined || priority === 'All' || caseItem.priority === priority)
    )));
  }

  getCase(caseId: string): Observable<ComplianceCaseDetail> {
    const claimId = Number(caseId);
    if (!Number.isInteger(claimId) || claimId < 1) return throwError(() => new Error('The claim identifier is invalid.'));
    return this.claimApi.getClaim(claimId).pipe(map((claim) => this.toCaseDetail(claim)));
  }

  getAuditLogs(search?: string, status?: string): Observable<AuditLogEntry[]> {
    const query = search?.trim().toLowerCase();
    return this.administrationService.getAudit().pipe(map((entries) => entries.map((entry) => ({
      id: entry.id,
      actor: entry.actorUserId,
      action: entry.action,
      module: entry.targetUserId ? 'Identity / user account' : 'Identity',
      status: 'Recorded',
      details: entry.details,
      occurredAtUtc: entry.occurredAtUtc
    })).filter((entry) => (!query || `${entry.actor} ${entry.action} ${entry.module} ${entry.details}`.toLowerCase().includes(query)) && (status === undefined || status === 'All' || entry.status === status))));
  }

  getReports(): Observable<ComplianceReportSummary> {
    return forkJoin({ cases: this.getCases(), alerts: this.getAlerts(), policies: this.policyService.getAll(), notifications: this.notificationService.getHistory(), metrics: this.reportingApi.getDashboardMetrics() }).pipe(map(({ cases, alerts }) => ({
      openCases: cases.filter((caseItem) => this.isOpen(caseItem.status)).length,
      resolvedCases: cases.filter((caseItem) => ['resolved', 'settled', 'closed'].some((status) => caseItem.status.toLowerCase().includes(status))).length,
      casesByPriority: this.countBy(cases, (caseItem) => caseItem.priority).map(([priority, count]) => ({ priority, count })),
      alertsByStatus: this.countBy(alerts, (alert) => alert.status).map(([status, count]) => ({ status, count })),
      recentActivity: cases.slice().sort((first, second) => second.openedAtUtc.localeCompare(first.openedAtUtc)).slice(0, 6).map((caseItem) => ({ id: caseItem.id, action: `${caseItem.status} claim record`, details: caseItem.reference, actor: caseItem.assignedTo || 'Claims service', occurredAtUtc: caseItem.openedAtUtc }))
    })));
  }

  private claimAlert(claim: ClaimSummary): ComplianceAlert {
    return { id: `claim-${claim.claimId}`, title: `${claim.priorityName} priority claim: ${claim.claimNumber}`, description: `${claim.claimTypeName} reported for policy ${claim.policyId}.`, status: claim.claimStatusName, priority: claim.priorityName, sourceModule: 'Claims', relatedCustomerId: String(claim.customerId), relatedPolicyId: String(claim.policyId), relatedClaimId: String(claim.claimId), createdAtUtc: claim.reportedAt };
  }

  private toCase(claim: ClaimSummary): ComplianceCase {
    return { id: String(claim.claimId), reference: claim.claimNumber, title: claim.claimTypeName, reason: `Claim monitoring record for ${claim.claimTypeName}.`, status: claim.claimStatusName, priority: claim.priorityName, relatedCustomerId: String(claim.customerId), relatedPolicyId: String(claim.policyId), relatedClaimId: String(claim.claimId), openedAtUtc: claim.reportedAt, assignedTo: claim.assignedToUserId ? `User ${claim.assignedToUserId}` : null };
  }

  private toCaseDetail(claim: ClaimDetail): ComplianceCaseDetail {
    return {
      ...this.toCase(claim),
      reason: claim.lossDescription,
      notes: [],
      activity: [
        ...claim.actionHistory.map((activity) => ({ id: `action-${activity.claimActionHistoryId}`, action: activity.actionType?.name || 'Claim action', details: activity.remarks, actor: 'Claims service', occurredAtUtc: activity.actionAt })),
        ...claim.statusHistory.map((history) => ({ id: `status-${history.claimStatusHistoryId}`, action: `Status: ${history.currentStatus?.name || 'Updated'}`, details: history.comments, actor: 'Claims service', occurredAtUtc: history.changedAt }))
      ].sort((first, second) => second.occurredAtUtc.localeCompare(first.occurredAtUtc))
    };
  }

  private isOpen(status: string): boolean { return !['settled', 'closed', 'rejected', 'resolved'].some((closedStatus) => status.toLowerCase().includes(closedStatus)); }
  private countBy<T>(items: T[], selector: (item: T) => string): [string, number][] { return [...items.reduce((counts, item) => counts.set(selector(item), (counts.get(selector(item)) ?? 0) + 1), new Map<string, number>()).entries()]; }
}