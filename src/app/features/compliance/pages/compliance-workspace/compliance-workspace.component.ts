import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuditLogEntry,
  ComplianceAlert,
  ComplianceCase,
  ComplianceCaseDetail,
  ComplianceDashboard,
  ComplianceReportSummary
} from '../../models/compliance.models';
import { ComplianceApiService } from '../../services/compliance-api.service';

type ComplianceView = 'dashboard' | 'alerts' | 'cases' | 'case-detail' | 'audit-logs' | 'reports';

@Component({
  selector: 'app-compliance-workspace',
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Compliance oversight</p>
          <h1 class="mt-2 font-serif text-3xl leading-tight text-emerald-950 sm:text-4xl">{{ pageTitle }}</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-emerald-900/65">{{ pageDescription }}</p>
        </div>
        @if (view !== 'case-detail') {
          <button type="button" class="border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-800" (click)="refresh()">Refresh</button>
        }
      </header>

      @if (feedback()) {
        <p class="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{{ feedback() }}</p>
      }
      @if (errorMessage()) {
        <div class="border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <strong>Unable to load compliance data.</strong> {{ errorMessage() }}
        </div>
      }
      @if (isLoading()) {
        <p class="border border-emerald-950/10 bg-white px-4 py-3 text-sm text-emerald-900/65">Loading compliance data...</p>
      }

      @switch (view) {
        @case ('dashboard') {
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <a routerLink="/compliance/alerts" class="border border-emerald-950/10 bg-white p-5 shadow-sm">
              <p class="text-sm font-semibold text-emerald-900/65">Total alerts</p>
              <p class="mt-3 font-serif text-3xl text-emerald-950">{{ dashboard()?.totalAlerts ?? '—' }}</p>
              <p class="mt-2 text-sm text-emerald-800">Review compliance alerts</p>
            </a>
            <a routerLink="/compliance/cases" class="border border-emerald-950/10 bg-white p-5 shadow-sm">
              <p class="text-sm font-semibold text-emerald-900/65">Open cases</p>
              <p class="mt-3 font-serif text-3xl text-emerald-950">{{ dashboard()?.openCases ?? '—' }}</p>
              <p class="mt-2 text-sm text-emerald-800">Open investigation queue</p>
            </a>
            <a routerLink="/compliance/cases" class="border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p class="text-sm font-semibold text-amber-900/75">High-priority cases</p>
              <p class="mt-3 font-serif text-3xl text-amber-950">{{ dashboard()?.highPriorityCases ?? '—' }}</p>
              <p class="mt-2 text-sm text-amber-900">Prioritize active risk</p>
            </a>
            <a routerLink="/compliance/cases" class="border border-emerald-950/10 bg-white p-5 shadow-sm">
              <p class="text-sm font-semibold text-emerald-900/65">Recently resolved</p>
              <p class="mt-3 font-serif text-3xl text-emerald-950">{{ dashboard()?.recentlyResolvedCases ?? '—' }}</p>
              <p class="mt-2 text-sm text-emerald-800">View case history</p>
            </a>
          </div>
          <section class="border border-emerald-950/10 bg-white shadow-sm">
            <div class="border-b border-emerald-950/10 px-5 py-4"><h2 class="font-serif text-2xl text-emerald-950">Recent compliance activity</h2></div>
            @if (dashboard()?.recentActivity?.length) {
              <ol class="divide-y divide-emerald-950/10">
                @for (activity of dashboard()?.recentActivity ?? []; track activity.id) {
                  <li class="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto]">
                    <div><p class="font-semibold text-emerald-950">{{ activity.action }}</p><p class="mt-1 text-sm text-emerald-900/65">{{ activity.details || activity.actor }}</p></div>
                    <p class="text-sm text-emerald-900/65">{{ activity.occurredAtUtc | date:'medium' }}</p>
                  </li>
                }
              </ol>
            } @else if (!isLoading() && !errorMessage()) {
              <p class="px-5 py-8 text-sm text-emerald-900/65">No recent compliance activity was returned by the service.</p>
            }
          </section>
        }

        @case ('alerts') {
          <div class="grid gap-3 border border-emerald-950/10 bg-white p-4 sm:grid-cols-3">
            <label class="text-sm font-semibold text-emerald-950">Status<select class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="alertStatus" (change)="loadAlerts()"><option>All</option><option>Open</option><option>Reviewed</option><option>Closed</option></select></label>
            <label class="text-sm font-semibold text-emerald-950">Priority<select class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="alertPriority" (change)="loadAlerts()"><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          </div>
          <section class="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
            <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-left text-sm"><thead class="border-b border-emerald-950/10 bg-emerald-50 text-emerald-950"><tr><th class="px-4 py-3">Alert</th><th class="px-4 py-3">Source</th><th class="px-4 py-3">Priority</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th><th class="px-4 py-3">Actions</th></tr></thead><tbody>
              @for (alert of alerts(); track alert.id) { <tr class="border-b border-emerald-950/10 align-top last:border-0"><td class="px-4 py-4"><p class="font-semibold text-emerald-950">{{ alert.title }}</p><p class="mt-1 max-w-sm text-emerald-900/65">{{ alert.description }}</p></td><td class="px-4 py-4">{{ alert.sourceModule }}</td><td class="px-4 py-4"><span [class]="priorityClass(alert.priority)">{{ alert.priority }}</span></td><td class="px-4 py-4"><span [class]="statusClass(alert.status)">{{ alert.status }}</span></td><td class="px-4 py-4">{{ alert.createdAtUtc | date:'mediumDate' }}</td><td class="px-4 py-4"><button type="button" class="font-bold text-emerald-800 underline underline-offset-4" (click)="showAlertDetails(alert)">Details</button></td></tr> }
              @empty { @if (!isLoading() && !errorMessage()) { <tr><td colspan="6" class="px-4 py-8 text-center text-emerald-900/65">No compliance alerts match the selected filters.</td></tr> } }
            </tbody></table></div>
          </section>
          @if (selectedAlert(); as alert) {
            <section class="border border-emerald-950/10 bg-white p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Alert details</p><h2 class="mt-2 font-serif text-2xl text-emerald-950">{{ alert.title }}</h2></div><button type="button" class="text-sm font-bold text-emerald-800 underline underline-offset-4" (click)="selectedAlert.set(null)">Close</button></div>
              <p class="mt-4 max-w-3xl text-sm leading-6 text-emerald-900/70">{{ alert.description }}</p>
              <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt class="font-semibold text-emerald-900/65">Customer</dt><dd class="mt-1 text-emerald-950">{{ alert.relatedCustomerId || 'Not linked' }}</dd></div><div><dt class="font-semibold text-emerald-900/65">Policy</dt><dd class="mt-1 text-emerald-950">{{ alert.relatedPolicyId || 'Not linked' }}</dd></div><div><dt class="font-semibold text-emerald-900/65">Claim</dt><dd class="mt-1 text-emerald-950">{{ alert.relatedClaimId || 'Not linked' }}</dd></div></dl>
            </section>
          }
        }

        @case ('cases') {
          <div class="grid gap-3 border border-emerald-950/10 bg-white p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
            <label class="text-sm font-semibold text-emerald-950">Search<input class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="caseSearch" (keyup.enter)="loadCases()" placeholder="Reference, title, or related record"></label>
            <label class="text-sm font-semibold text-emerald-950">Status<select class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="caseStatus" (change)="loadCases()"><option>All</option><option>Open</option><option>Escalated</option><option>Resolved</option><option>Closed</option></select></label>
            <label class="text-sm font-semibold text-emerald-950">Priority<select class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="casePriority" (change)="loadCases()"><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <button type="button" class="self-end border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-800" (click)="loadCases()">Search</button>
          </div>
          <section class="overflow-hidden border border-emerald-950/10 bg-white shadow-sm"><div class="overflow-x-auto"><table class="w-full min-w-[850px] text-left text-sm"><thead class="border-b border-emerald-950/10 bg-emerald-50"><tr><th class="px-4 py-3">Case</th><th class="px-4 py-3">Priority</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Related record</th><th class="px-4 py-3">Opened</th><th class="px-4 py-3"></th></tr></thead><tbody>
            @for (caseItem of cases(); track caseItem.id) { <tr class="border-b border-emerald-950/10 last:border-0"><td class="px-4 py-4"><p class="font-semibold text-emerald-950">{{ caseItem.reference }}</p><p class="mt-1 text-emerald-900/65">{{ caseItem.title }}</p></td><td class="px-4 py-4"><span [class]="priorityClass(caseItem.priority)">{{ caseItem.priority }}</span></td><td class="px-4 py-4"><span [class]="statusClass(caseItem.status)">{{ caseItem.status }}</span></td><td class="px-4 py-4">{{ relatedRecords(caseItem) }}</td><td class="px-4 py-4">{{ caseItem.openedAtUtc | date:'mediumDate' }}</td><td class="px-4 py-4"><a [routerLink]="['/compliance/cases', caseItem.id]" class="font-bold text-emerald-800 underline underline-offset-4">Open</a></td></tr> }
            @empty { @if (!isLoading() && !errorMessage()) { <tr><td colspan="6" class="px-4 py-8 text-center text-emerald-900/65">No compliance cases match the selected filters.</td></tr> } }
          </tbody></table></div></section>
        }

        @case ('case-detail') {
          <a routerLink="/compliance/cases" class="inline-block text-sm font-bold text-emerald-800 underline underline-offset-4">Back to cases</a>
          @if (caseDetail(); as caseItem) {
            <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div class="space-y-6">
                <section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-sm font-bold text-emerald-800">{{ caseItem.reference }}</p><h2 class="mt-1 font-serif text-3xl text-emerald-950">{{ caseItem.title }}</h2></div><div class="flex gap-2"><span [class]="priorityClass(caseItem.priority)">{{ caseItem.priority }}</span><span [class]="statusClass(caseItem.status)">{{ caseItem.status }}</span></div></div><dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold text-emerald-900/65">Reason</dt><dd class="mt-1 text-emerald-950">{{ caseItem.reason }}</dd></div><div><dt class="font-semibold text-emerald-900/65">Assigned to</dt><dd class="mt-1 text-emerald-950">{{ caseItem.assignedTo || 'Unassigned' }}</dd></div><div><dt class="font-semibold text-emerald-900/65">Customer</dt><dd class="mt-1 text-emerald-950">{{ caseItem.relatedCustomerId || 'Not linked' }}</dd></div><div><dt class="font-semibold text-emerald-900/65">Policy / claim</dt><dd class="mt-1 text-emerald-950">{{ relatedRecords(caseItem) }}</dd></div></dl></section>
                <section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Investigation notes</h2>
                  @if (caseItem.notes.length) { <ol class="mt-6 divide-y divide-emerald-950/10">@for (note of caseItem.notes; track note.id) { <li class="py-4"><p class="text-emerald-950">{{ note.content }}</p><p class="mt-2 text-xs text-emerald-900/65">{{ note.author }} · {{ note.createdAtUtc | date:'medium' }}</p></li> }</ol> } @else { <p class="mt-4 text-sm text-emerald-900/65">No investigation-note API is available. This screen shows evidence and activity from the existing Claim service.</p> }
                </section>
              </div>
              <aside class="space-y-6"><section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Compliance context</h2><p class="mt-2 text-sm leading-6 text-emerald-900/65">This is a read-only monitoring view. Escalation, resolution, approval, settlement, and payment actions require backend endpoints that are not part of the deployed platform.</p></section><section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Activity</h2>@if (caseItem.activity.length) { <ol class="mt-4 space-y-4">@for (activity of caseItem.activity; track activity.id) { <li><p class="font-semibold text-emerald-950">{{ activity.action }}</p><p class="mt-1 text-sm text-emerald-900/65">{{ activity.details || activity.actor }}</p><p class="mt-1 text-xs text-emerald-900/55">{{ activity.occurredAtUtc | date:'medium' }}</p></li> }</ol> } @else { <p class="mt-4 text-sm text-emerald-900/65">No case activity was returned.</p> }</section></aside>
            </div>
          } @else if (!isLoading() && !errorMessage()) { <p class="border border-emerald-950/10 bg-white p-5 text-sm text-emerald-900/65">This compliance case is not available.</p> }
        }

        @case ('audit-logs') {
          <div class="grid gap-3 border border-emerald-950/10 bg-white p-4 sm:grid-cols-[2fr_1fr_auto]"><label class="text-sm font-semibold text-emerald-950">Search<input class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="auditSearch" (keyup.enter)="loadAuditLogs()" placeholder="Actor, action, module, or detail"></label><label class="text-sm font-semibold text-emerald-950">Status<select class="mt-1 block w-full border border-emerald-950/20 bg-white px-3 py-2 font-normal" [(ngModel)]="auditStatus" (change)="loadAuditLogs()"><option>All</option><option>Success</option><option>Failed</option></select></label><button type="button" class="self-end border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-800" (click)="loadAuditLogs()">Search</button></div>
          <section class="overflow-hidden border border-emerald-950/10 bg-white shadow-sm"><div class="overflow-x-auto"><table class="w-full min-w-[850px] text-left text-sm"><thead class="border-b border-emerald-950/10 bg-emerald-50"><tr><th class="px-4 py-3">Actor</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Module / resource</th><th class="px-4 py-3">Date and time</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Details</th></tr></thead><tbody>@for (entry of auditLogs(); track entry.id) { <tr class="border-b border-emerald-950/10 align-top last:border-0"><td class="px-4 py-4 font-semibold text-emerald-950">{{ entry.actor }}</td><td class="px-4 py-4">{{ entry.action }}</td><td class="px-4 py-4">{{ entry.module }}</td><td class="px-4 py-4">{{ entry.occurredAtUtc | date:'medium' }}</td><td class="px-4 py-4"><span [class]="statusClass(entry.status)">{{ entry.status }}</span></td><td class="px-4 py-4 text-emerald-900/65">{{ entry.details || '—' }}</td></tr> } @empty { @if (!isLoading() && !errorMessage()) { <tr><td colspan="6" class="px-4 py-8 text-center text-emerald-900/65">No audit logs match the selected filters.</td></tr> } }</tbody></table></div></section>
        }

        @case ('reports') {
          @if (reportSummary(); as report) {
            <div class="grid gap-4 sm:grid-cols-2"><article class="border border-emerald-950/10 bg-white p-5 shadow-sm"><p class="text-sm font-semibold text-emerald-900/65">Open cases</p><p class="mt-3 font-serif text-3xl text-emerald-950">{{ report.openCases }}</p></article><article class="border border-emerald-950/10 bg-white p-5 shadow-sm"><p class="text-sm font-semibold text-emerald-900/65">Resolved cases</p><p class="mt-3 font-serif text-3xl text-emerald-950">{{ report.resolvedCases }}</p></article></div>
            <div class="grid gap-6 xl:grid-cols-2"><section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Cases by priority</h2><div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-emerald-950/10"><tr><th class="py-3">Priority</th><th class="py-3">Cases</th></tr></thead><tbody>@for (item of report.casesByPriority; track item.priority) { <tr class="border-b border-emerald-950/10 last:border-0"><td class="py-3"><span [class]="priorityClass(item.priority)">{{ item.priority }}</span></td><td class="py-3">{{ item.count }}</td></tr> } @empty { <tr><td colspan="2" class="py-5 text-emerald-900/65">No priority summary is available.</td></tr> }</tbody></table></div></section><section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Compliance alerts summary</h2><div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-emerald-950/10"><tr><th class="py-3">Status</th><th class="py-3">Alerts</th></tr></thead><tbody>@for (item of report.alertsByStatus; track item.status) { <tr class="border-b border-emerald-950/10 last:border-0"><td class="py-3"><span [class]="statusClass(item.status)">{{ item.status }}</span></td><td class="py-3">{{ item.count }}</td></tr> } @empty { <tr><td colspan="2" class="py-5 text-emerald-900/65">No alert summary is available.</td></tr> }</tbody></table></div></section></div>
            <section class="border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 class="font-serif text-2xl text-emerald-950">Recent compliance activity</h2>@if (report.recentActivity.length) { <ol class="mt-4 divide-y divide-emerald-950/10">@for (activity of report.recentActivity; track activity.id) { <li class="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p class="font-semibold text-emerald-950">{{ activity.action }}</p><p class="text-sm text-emerald-900/65">{{ activity.details || activity.actor }}</p></div><p class="text-sm text-emerald-900/65">{{ activity.occurredAtUtc | date:'medium' }}</p></li> }</ol> } @else { <p class="mt-4 text-sm text-emerald-900/65">No recent activity is available.</p> }</section>
          } @else if (!isLoading() && !errorMessage()) { <p class="border border-emerald-950/10 bg-white p-5 text-sm text-emerald-900/65">No compliance report summary is available.</p> }
        }
      }
    </section>
  `
})
export class ComplianceWorkspaceComponent {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly view = (this.route.snapshot.data['view'] as ComplianceView | undefined) ?? 'dashboard';
  protected readonly pageTitle = this.titleFor(this.view);
  protected readonly pageDescription = this.descriptionFor(this.view);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly feedback = signal('');
  protected readonly dashboard = signal<ComplianceDashboard | null>(null);
  protected readonly alerts = signal<ComplianceAlert[]>([]);
  protected readonly selectedAlert = signal<ComplianceAlert | null>(null);
  protected readonly cases = signal<ComplianceCase[]>([]);
  protected readonly caseDetail = signal<ComplianceCaseDetail | null>(null);
  protected readonly auditLogs = signal<AuditLogEntry[]>([]);
  protected readonly reportSummary = signal<ComplianceReportSummary | null>(null);
  protected alertStatus = 'All';
  protected alertPriority = 'All';
  protected caseSearch = '';
  protected caseStatus = 'All';
  protected casePriority = 'All';
  protected auditSearch = '';
  protected auditStatus = 'All';

  constructor() { this.refresh(); }

  protected refresh(): void {
    switch (this.view) {
      case 'alerts': this.loadAlerts(); break;
      case 'cases': this.loadCases(); break;
      case 'case-detail': this.loadCase(); break;
      case 'audit-logs': this.loadAuditLogs(); break;
      case 'reports': this.loadReports(); break;
      default: this.loadDashboard();
    }
  }

  protected loadAlerts(): void {
    this.beginLoad();
    this.complianceApi.getAlerts(this.alertStatus, this.alertPriority).subscribe({
      next: (alerts) => { this.alerts.set(alerts); this.isLoading.set(false); },
      error: (error) => this.fail(error)
    });
  }

  protected loadCases(): void {
    this.beginLoad();
    this.complianceApi.getCases(this.caseSearch.trim(), this.caseStatus, this.casePriority).subscribe({
      next: (cases) => { this.cases.set(cases); this.isLoading.set(false); },
      error: (error) => this.fail(error)
    });
  }

  protected loadAuditLogs(): void {
    this.beginLoad();
    this.complianceApi.getAuditLogs(this.auditSearch.trim(), this.auditStatus).subscribe({
      next: (entries) => { this.auditLogs.set(entries); this.isLoading.set(false); },
      error: (error) => this.fail(error)
    });
  }

  protected showAlertDetails(alert: ComplianceAlert): void { this.selectedAlert.set(alert); }

  protected priorityClass(priority: string): string {
    const normalized = priority.toLowerCase();
    return normalized === 'critical' || normalized === 'high'
      ? 'inline-block border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-800'
      : normalized === 'medium'
        ? 'inline-block border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900'
        : 'inline-block border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800';
  }

  protected statusClass(status: string): string {
    const normalized = status.toLowerCase();
    return normalized.includes('fail') || normalized.includes('reject') || normalized.includes('closed')
      ? 'inline-block border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-800'
      : normalized.includes('open') || normalized.includes('pending') || normalized.includes('escalat')
        ? 'inline-block border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900'
        : 'inline-block border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800';
  }

  protected relatedRecords(caseItem: ComplianceCase): string {
    return [caseItem.relatedPolicyId && `Policy ${caseItem.relatedPolicyId}`, caseItem.relatedClaimId && `Claim ${caseItem.relatedClaimId}`].filter(Boolean).join(' · ') || 'Not linked';
  }

  private loadDashboard(): void {
    this.beginLoad();
    this.complianceApi.getDashboard().subscribe({ next: (dashboard) => { this.dashboard.set(dashboard); this.isLoading.set(false); }, error: (error) => this.fail(error) });
  }

  private loadCase(): void {
    const caseId = this.route.snapshot.paramMap.get('id');
    if (!caseId) { this.errorMessage.set('The compliance case identifier is missing.'); this.isLoading.set(false); return; }
    this.beginLoad();
    this.complianceApi.getCase(caseId).subscribe({ next: (caseItem) => { this.caseDetail.set(caseItem); this.isLoading.set(false); }, error: (error) => this.fail(error) });
  }

  private loadReports(): void {
    this.beginLoad();
    this.complianceApi.getReports().subscribe({ next: (summary) => { this.reportSummary.set(summary); this.isLoading.set(false); }, error: (error) => this.fail(error) });
  }

  private beginLoad(): void { this.isLoading.set(true); this.errorMessage.set(''); }

  private fail(error: unknown): void {
    const response = error as HttpErrorResponse;
    this.errorMessage.set(response.error?.message ?? response.message ?? 'The compliance service did not return a usable response.');
    this.isLoading.set(false);
  }

  private titleFor(view: ComplianceView): string {
    return ({ dashboard: 'Compliance dashboard', alerts: 'Compliance alerts', cases: 'Compliance cases', 'case-detail': 'Compliance case', 'audit-logs': 'Audit logs', reports: 'Compliance reports' })[view];
  }

  private descriptionFor(view: ComplianceView): string {
    return ({ dashboard: 'Monitor investigation workload, exceptions, and recent compliance activity.', alerts: 'Review exceptions and create an investigation when further action is required.', cases: 'Search and manage compliance investigations assigned to the oversight workflow.', 'case-detail': 'Review the investigation record, related resources, notes, and case activity.', 'audit-logs': 'Read-only records of actions performed across authorized insurance services.', reports: 'A concise summary of case workload, alert status, and recent compliance activity.' })[view];
  }
}