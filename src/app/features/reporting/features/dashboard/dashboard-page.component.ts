import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DashboardMetric, ReportRequest, ScheduledReport } from '../../core/models/reporting.models';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Overview</p>
          <h2 class="page-title">Reporting activity at a glance</h2>
          <p class="page-copy">The first screen reflects the existing service: metrics, pending jobs, active catalog entries, and schedules.</p>
        </div>
        <div class="actions-row">
          <button class="secondary-button" type="button" (click)="loadDashboard()">Refresh</button>
        </div>
      </header>

      @if (errorMessage()) {
        <div class="alert">{{ errorMessage() }}</div>
      }

      <div class="metrics-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="metric-card">
            <p class="eyebrow">{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <p>{{ card.note }}</p>
          </article>
        }
      </div>

      <div class="split-grid">
        <section class="surface-card">
          <div class="section-header">
            <div>
              <p class="page-kicker">Queue</p>
              <h3>Pending report requests</h3>
            </div>
            @if (isLoading()) {
              <span class="loading-copy">Loading...</span>
            }
          </div>

          @if (pendingRequests().length) {
            <div class="list-stack" style="margin-top: 18px;">
              @for (request of pendingRequests().slice(0, 5); track request.reportRequestId) {
                <article class="list-row">
                  <div>
                    <strong>{{ request.reportCode }}</strong>
                    <p class="table-subtext">Requested by user {{ request.requestedByUserId }} on {{ request.requestedAt | date: 'medium' }}</p>
                  </div>
                  <span class="status-pill" [attr.data-tone]="statusTone(request.reportStatus?.code)">
                    {{ request.reportStatus?.name || 'Pending' }}
                  </span>
                </article>
              }
            </div>
          } @else {
            <div class="empty-state" style="margin-top: 18px;">
              <p>No pending requests are currently returned by the service.</p>
            </div>
          }
        </section>

        <section class="surface-card">
          <div class="section-header">
            <div>
              <p class="page-kicker">Automation</p>
              <h3>Upcoming scheduled reports</h3>
            </div>
          </div>

          @if (activeSchedules().length) {
            <div class="list-stack" style="margin-top: 18px;">
              @for (schedule of activeSchedules().slice(0, 5); track schedule.scheduledReportId) {
                <article class="list-row">
                  <div>
                    <strong>{{ schedule.scheduleName }}</strong>
                    <p class="table-subtext">{{ schedule.cronExpression }} · {{ schedule.outputFormat?.name || 'Configured format' }}</p>
                  </div>
                  <div class="table-subtext">{{ schedule.nextRunAt ? (schedule.nextRunAt | date: 'medium') : 'No next run calculated' }}</div>
                </article>
              }
            </div>
          } @else {
            <div class="empty-state" style="margin-top: 18px;">
              <p>No active schedules were returned by the backend.</p>
            </div>
          }
        </section>
      </div>

      <section class="surface-card">
        <div class="surface-card-header">
          <div>
            <p class="page-kicker">Metrics Feed</p>
            <h3>Latest dashboard metrics</h3>
          </div>
        </div>

        @if (metrics().length) {
          <div class="table-wrap" style="margin-top: 18px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Code</th>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                @for (metric of metrics().slice(0, 8); track metric.dashboardMetricId) {
                  <tr>
                    <td>
                      <strong>{{ metric.metricName }}</strong>
                    </td>
                    <td><span class="code-block">{{ metric.metricCode }}</span></td>
                    <td>{{ metric.metricDate | date: 'mediumDate' }}</td>
                    <td>{{ formatMetric(metric) }}</td>
                    <td>{{ metric.sourceService }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state" style="margin-top: 18px;">
            <p>No dashboard metrics are available yet.</p>
          </div>
        }
      </section>
    </section>
  `
})
export class DashboardPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly metrics = signal<DashboardMetric[]>([]);
  protected readonly pendingRequests = signal<ReportRequest[]>([]);
  protected readonly activeDefinitionsCount = signal(0);
  protected readonly activeSchedules = signal<ScheduledReport[]>([]);

  protected readonly summaryCards = computed(() => {
    const latestMetric = this.metrics()[0];

    return [
      {
        label: 'Latest KPI',
        value: latestMetric ? this.formatMetric(latestMetric) : 'No data',
        note: latestMetric ? latestMetric.metricName : 'Awaiting dashboard metrics'
      },
      {
        label: 'Pending requests',
        value: String(this.pendingRequests().length),
        note: 'Queue items currently awaiting completion'
      },
      {
        label: 'Active definitions',
        value: String(this.activeDefinitionsCount()),
        note: 'Catalog entries marked as active'
      },
      {
        label: 'Live schedules',
        value: String(this.activeSchedules().length),
        note: 'Recurring report jobs enabled in the service'
      }
    ];
  });

  constructor() {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      metrics: this.reportingApi.getDashboardMetrics(),
      pendingRequests: this.reportingApi.getReportRequests({ pendingOnly: true }),
      activeDefinitions: this.reportingApi.getReportDefinitions(true),
      activeSchedules: this.reportingApi.getScheduledReports({ activeOnly: true })
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ metrics, pendingRequests, activeDefinitions, activeSchedules }) => {
          this.metrics.set(metrics);
          this.pendingRequests.set(pendingRequests);
          this.activeDefinitionsCount.set(activeDefinitions.length);
          this.activeSchedules.set(activeSchedules);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load reporting dashboard data.');
          this.isLoading.set(false);
        }
      });
  }

  protected formatMetric(metric: DashboardMetric): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: metric.metricUnit === '%' ? 1 : 2
    }).format(metric.metricValue) + (metric.metricUnit ? ` ${metric.metricUnit}` : '');
  }

  protected statusTone(statusCode?: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((statusCode || '').toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCEEDED':
        return 'success';
      case 'FAILED':
      case 'CANCELLED':
        return 'danger';
      case 'PENDING':
      case 'QUEUED':
      case 'INPROGRESS':
      case 'RUNNING':
      case 'RETRYING':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}