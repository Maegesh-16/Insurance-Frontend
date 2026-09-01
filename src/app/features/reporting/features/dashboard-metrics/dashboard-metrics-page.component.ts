import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardMetric } from '../../core/models/reporting.models';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-dashboard-metrics-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Analytics</p>
          <h2 class="page-title">Dashboard metrics</h2>
          <p class="page-copy">Use the same query surface as the API: filter by code, metric date, and source service for exact backend-aligned reads.</p>
        </div>
      </header>

      <section class="surface-card page-stack">
        <div class="filter-grid">
          <div class="field">
            <label for="metricCode">Metric code</label>
            <input id="metricCode" [(ngModel)]="metricCode" name="metricCode" placeholder="CLAIM_COUNT" />
          </div>

          <div class="field">
            <label for="metricDate">Metric date</label>
            <input id="metricDate" type="date" [(ngModel)]="metricDate" name="metricDate" />
          </div>

          <div class="field">
            <label for="sourceService">Source service</label>
            <input id="sourceService" [(ngModel)]="sourceService" name="sourceService" placeholder="claims-worker" />
          </div>

          <div class="field" style="justify-content: end;">
            <label>&nbsp;</label>
            <div class="actions-row">
              <button class="primary-button" type="button" (click)="loadMetrics()">Load metrics</button>
            </div>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="alert">{{ errorMessage() }}</div>
        }

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Date</th>
                <th>Value</th>
                <th>Source</th>
                <th>Dimensions</th>
              </tr>
            </thead>
            <tbody>
              @for (metric of metrics(); track metric.dashboardMetricId) {
                <tr>
                  <td>
                    <strong>{{ metric.metricName }}</strong>
                    <div class="table-subtext">{{ metric.metricCode }}</div>
                  </td>
                  <td>{{ metric.metricDate }}</td>
                  <td>{{ formatMetric(metric) }}</td>
                  <td>{{ metric.sourceService }}</td>
                  <td>{{ metric.dimensionJson || 'No dimensional breakdown' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `
})
export class DashboardMetricsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');
  protected readonly metrics = signal<DashboardMetric[]>([]);

  protected metricCode = '';
  protected metricDate = '';
  protected sourceService = '';

  constructor() {
    this.loadMetrics();
  }

  protected loadMetrics(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getDashboardMetrics({
        metricCode: this.metricCode || null,
        metricDate: this.metricDate || null,
        sourceService: this.sourceService || null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (metrics) => this.metrics.set(metrics),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load dashboard metrics.');
        }
      });
  }

  protected formatMetric(metric: DashboardMetric): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: metric.metricUnit === '%' ? 1 : 2
    }).format(metric.metricValue) + (metric.metricUnit ? ` ${metric.metricUnit}` : '');
  }
}