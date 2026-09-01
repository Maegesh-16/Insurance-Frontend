import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ReportExecutionHistory } from '../../core/models/reporting.models';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-execution-history-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Audit Trail</p>
          <h2 class="page-title">Execution history</h2>
          <p class="page-copy">Each row comes from the report execution history resource and exposes status, runtime, and failure context.</p>
        </div>
      </header>

      <section class="surface-card page-stack">
        <div class="filter-grid">
          <div class="field">
            <label for="historyRequestId">Report request ID</label>
            <input id="historyRequestId" [(ngModel)]="reportRequestId" name="reportRequestId" placeholder="Optional request filter" />
          </div>

          <div class="field" style="justify-content: end;">
            <label>&nbsp;</label>
            <div class="actions-row">
              <button class="primary-button" type="button" (click)="loadHistory()">Load history</button>
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
                <th>Execution</th>
                <th>Status</th>
                <th>Timing</th>
                <th>Processing</th>
                <th>Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of history(); track entry.reportExecutionHistoryId) {
                <tr>
                  <td>
                    <strong>Request {{ entry.reportRequestId }}</strong>
                    <div class="table-subtext">History ID {{ entry.reportExecutionHistoryId }}</div>
                  </td>
                  <td>
                    <span class="status-pill" [attr.data-tone]="statusTone(entry.executionStatus?.code)">
                      {{ entry.executionStatus?.name || 'Unknown' }}
                    </span>
                  </td>
                  <td>
                    <div>{{ entry.startedAt | date: 'medium' }}</div>
                    <div class="table-subtext">{{ entry.completedAt ? (entry.completedAt | date: 'medium') : 'Still running' }}</div>
                  </td>
                  <td>
                    <div>{{ entry.workerName || 'Unknown worker' }}</div>
                    <div class="table-subtext">{{ entry.recordsCount || 0 }} records · {{ entry.executionTimeMs || 0 }} ms</div>
                  </td>
                  <td>
                    @if (entry.errorMessage) {
                      <div>{{ entry.errorMessage }}</div>
                      <div class="table-subtext">{{ entry.correlationId || 'No correlation id' }}</div>
                    } @else {
                      <span class="table-subtext">No error message recorded</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `
})
export class ExecutionHistoryPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');
  protected readonly history = signal<ReportExecutionHistory[]>([]);

  protected reportRequestId = '';

  constructor() {
    this.loadHistory();
  }

  protected loadHistory(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getReportExecutionHistories(this.reportRequestId ? Number(this.reportRequestId) : null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.history.set(history);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load execution history.');
        }
      });
  }

  protected statusTone(statusCode?: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((statusCode || '').toUpperCase()) {
      case 'SUCCEEDED':
        return 'success';
      case 'FAILED':
      case 'CANCELLED':
        return 'danger';
      case 'QUEUED':
      case 'RUNNING':
      case 'RETRYING':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}