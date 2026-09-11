import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ReportingApiService } from '../../core/services/reporting-api.service';
import { OutputFormat, ReportDefinition, ReportRequest, ReportSnapshot } from '../../core/models/reporting.models';

interface ReportCategoryRouteData {
  title: string;
  categoryCode: string;
  audience: string;
  summary: string;
  useCases: string[];
}

@Component({
  selector: 'app-report-category-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Role-Aware Reports</p>
          <h2 class="page-title">{{ pageTitle() }}</h2>
          <p class="page-copy">{{ pageSummary() }}</p>
        </div>
        <div class="actions-row">
          <span class="topbar-badge">Audience: {{ audience() }}</span>
          <button class="secondary-button" type="button" (click)="loadCategoryData()">Refresh</button>
        </div>
      </header>

      <div class="split-grid report-stage-grid">
        <section class="surface-card page-stack report-hero-card">
          <div>
            <p class="page-kicker">Business Use Cases</p>
            <h3>{{ categoryCode() }} reporting lane</h3>
            <p class="page-copy">These flows are driven from the BRD reporting module and exposed to viewers and admins according to their role.</p>
          </div>

          <div class="chip-list">
            @for (useCase of useCases(); track useCase) {
              <article class="chip-card report-chip">
                <strong>{{ useCase }}</strong>
              </article>
            }
          </div>

          <div class="actions-row report-actions-row">
            <a class="primary-button" [routerLink]="'/report-requests'">Request from operations</a>
            @if (isAdmin()) {
              <a class="secondary-button" [routerLink]="'/report-definitions'">Manage definitions</a>
              <a class="secondary-button" [routerLink]="'/scheduled-reports'">Manage schedules</a>
            }
          </div>
        </section>

        <section class="surface-card page-stack">
          <div class="surface-card-header">
            <div>
              <p class="page-kicker">Portfolio</p>
              <h3>Available report definitions</h3>
            </div>
            <span class="soft-badge">{{ definitions().length }} available</span>
          </div>

          @if (definitions().length) {
            <div class="list-stack">
              @for (definition of definitions(); track definition.reportDefinitionId) {
                <button class="report-option-card" type="button" (click)="selectReportCode(definition.reportCode)">
                  <span>
                    <strong>{{ definition.reportName }}</strong>
                    <span class="table-subtext">{{ definition.reportCode }}</span>
                  </span>
                  <span class="soft-badge">{{ definition.defaultFormat?.name || 'Format pending' }}</span>
                </button>
              }
            </div>
          } @else {
            <div class="empty-state">
              <p>No active report definitions were returned for this category.</p>
            </div>
          }
        </section>
      </div>

      @if (errorMessage()) {
        <div class="alert">{{ errorMessage() }}</div>
      }

      <section class="surface-card page-stack">
        <div class="filter-header">
          <div>
            <p class="page-kicker">Focused Report</p>
            <h3>{{ selectedDefinition()?.reportName || 'Select a report definition' }}</h3>
            <p class="page-copy">The details below are scoped to the currently selected report code.</p>
          </div>
          @if (selectedDefinition()) {
            <span class="soft-badge">{{ selectedDefinition()?.reportCode }}</span>
          }
        </div>

        @if (selectedDefinition()) {
          <div class="metrics-grid report-metrics-grid">
            <article class="metric-card">
              <p class="eyebrow">Latest request</p>
              <strong>{{ recentRequests().length }}</strong>
              <p>{{ recentRequests().length ? recentRequests()[0].reportStatus?.name || 'Unknown' : 'No requests yet' }}</p>
            </article>
            <article class="metric-card">
              <p class="eyebrow">Snapshots</p>
              <strong>{{ reportSnapshots().length }}</strong>
              <p>{{ latestSnapshot() ? latestSnapshot()!.snapshotDate : 'No archived snapshot' }}</p>
            </article>
            <article class="metric-card">
              <p class="eyebrow">Delivery mode</p>
              <strong>{{ selectedDefinition()?.isScheduledAllowed ? 'Scheduled' : 'Manual' }}</strong>
              <p>{{ selectedDefinition()?.isAdhocAllowed ? 'Ad-hoc requests enabled' : 'Ad-hoc requests restricted' }}</p>
            </article>
            <article class="metric-card">
              <p class="eyebrow">Audience</p>
              <strong>{{ isAdmin() ? 'Admin' : 'Viewer' }}</strong>
              <p>{{ isAdmin() ? 'Full configuration access' : 'Consumption and request access' }}</p>
            </article>
          </div>

          <div class="split-grid report-stage-grid">
            <section class="surface-card report-inner-card">
              <div class="surface-card-header">
                <div>
                  <p class="page-kicker">Recent Requests</p>
                  <h3>Operational activity</h3>
                </div>
                <a class="secondary-button" [routerLink]="'/report-requests'">Open request center</a>
              </div>

              @if (recentRequests().length) {
                <div class="table-wrap" style="margin-top: 18px;">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Status</th>
                        <th>Requested At</th>
                        <th>Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (request of recentRequests().slice(0, 6); track request.reportRequestId) {
                        <tr>
                          <td>
                            <strong>{{ request.reportCode }}</strong>
                            <div class="table-subtext">Request {{ request.reportRequestId }} by user {{ request.requestedByUserId }}</div>
                          </td>
                          <td>
                            <span class="status-pill" [attr.data-tone]="statusTone(request.reportStatus?.code)">
                              {{ request.reportStatus?.name || 'Unknown' }}
                            </span>
                          </td>
                          <td>{{ request.requestedAt | date: 'medium' }}</td>
                          <td>{{ request.outputFormat?.name || selectedDefinition()?.defaultFormat?.name || 'N/A' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state" style="margin-top: 18px;">
                  <p>No report requests are currently associated with this report code.</p>
                </div>
              }
            </section>

            <section class="surface-card report-inner-card">
              <div class="surface-card-header">
                <div>
                  <p class="page-kicker">Archive</p>
                  <h3>Snapshots and retention</h3>
                </div>
                <a class="secondary-button" [routerLink]="'/report-snapshots'">Open snapshot center</a>
              </div>

              @if (latestSnapshot()) {
                <div class="success-banner" style="margin-top: 18px;">
                  Latest snapshot: {{ latestSnapshot()!.snapshotDate }} · {{ latestSnapshot()!.versionLabel || 'No version label' }}
                </div>
              }

              @if (reportSnapshots().length) {
                <div class="list-stack" style="margin-top: 18px;">
                  @for (snapshot of reportSnapshots().slice(0, 5); track snapshot.reportSnapshotId) {
                    <article class="list-row">
                      <div>
                        <strong>{{ snapshot.snapshotDate }}</strong>
                        <p class="table-subtext">{{ snapshot.periodStartDate }} to {{ snapshot.periodEndDate }}</p>
                      </div>
                      <span class="soft-badge">{{ snapshot.versionLabel || 'No version label' }}</span>
                    </article>
                  }
                </div>
              } @else {
                <div class="empty-state" style="margin-top: 18px;">
                  <p>No snapshots are available for the selected report.</p>
                </div>
              }
            </section>
          </div>
        } @else {
          <div class="empty-state">
            <p>Select a report definition to load requests and snapshots for this reporting lane.</p>
          </div>
        }
      </section>
    </section>
  `
})
export class ReportCategoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reportingApi = inject(ReportingApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');
  protected readonly definitions = signal<ReportDefinition[]>([]);
  protected readonly allRequests = signal<ReportRequest[]>([]);
  protected readonly reportSnapshots = signal<ReportSnapshot[]>([]);
  protected readonly selectedReportCode = signal('');

  protected readonly routeData = computed(() => this.route.snapshot.data as ReportCategoryRouteData);
  protected readonly pageTitle = computed(() => this.routeData().title);
  protected readonly categoryCode = computed(() => this.routeData().categoryCode);
  protected readonly audience = computed(() => this.routeData().audience);
  protected readonly pageSummary = computed(() => this.routeData().summary);
  protected readonly useCases = computed(() => this.routeData().useCases ?? []);
  protected readonly isAdmin = computed(() => this.authService.hasAnyRole(['Admin', 'ReportingAdmin']));
  protected readonly selectedDefinition = computed(
    () => this.definitions().find((definition) => definition.reportCode === this.selectedReportCode()) ?? null
  );
  protected readonly recentRequests = computed(() =>
    this.allRequests()
      .filter((request) => request.reportCode === this.selectedReportCode())
      .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime())
  );
  protected readonly latestSnapshot = computed(
    () =>
      [...this.reportSnapshots()].sort(
        (left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime()
      )[0] ?? null
  );

  constructor() {
    this.loadCategoryData();
  }

  protected loadCategoryData(): void {
    this.errorMessage.set('');

    forkJoin({
      definitions: this.reportingApi.getReportDefinitions(true),
      requests: this.reportingApi.getReportRequests(),
      outputFormats: this.reportingApi.getOutputFormats(true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ definitions, requests, outputFormats }) => {
          const categoryDefinitions = definitions
            .filter((definition) => definition.category?.code === this.categoryCode())
            .map((definition) => this.attachDefaultFormat(definition, outputFormats));

          this.definitions.set(categoryDefinitions);
          this.allRequests.set(requests.filter((request) => categoryDefinitions.some((definition) => definition.reportCode === request.reportCode)));

          const defaultCode = this.selectedReportCode() || categoryDefinitions[0]?.reportCode || '';
          this.selectedReportCode.set(defaultCode);

          if (defaultCode) {
            this.loadSnapshots(defaultCode);
          } else {
            this.reportSnapshots.set([]);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load report category data.');
        }
      });
  }

  protected selectReportCode(reportCode: string): void {
    this.selectedReportCode.set(reportCode);
    this.loadSnapshots(reportCode);
  }

  protected statusTone(statusCode?: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((statusCode || '').toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCEEDED':
        return 'success';
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
        return 'danger';
      case 'PENDING':
      case 'INPROGRESS':
      case 'QUEUED':
      case 'RUNNING':
      case 'RETRYING':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  private loadSnapshots(reportCode: string): void {
    this.reportingApi
      .getReportSnapshots(reportCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshots) => this.reportSnapshots.set(snapshots),
        error: () => this.reportSnapshots.set([])
      });
  }

  private attachDefaultFormat(definition: ReportDefinition, outputFormats: OutputFormat[]): ReportDefinition {
    return definition.defaultFormat
      ? definition
      : {
          ...definition,
          defaultFormat: outputFormats.find((format) => format.outputFormatId === definition.defaultFormatId) ?? null
        };
  }
}