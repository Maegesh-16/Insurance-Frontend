import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CreateReportRequestPayload,
  OutputFormat,
  ReportDefinition,
  ReportRequest,
  ReportStatus
} from '../../core/models/reporting.models';
import { AuthService } from '../../core/services/auth.service';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-report-requests-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Execution</p>
          <h2 class="page-title">Report requests</h2>
          <p class="page-copy">Create ad-hoc report requests and review lifecycle status from the same backend collection.</p>
        </div>
      </header>

      <div class="split-grid">
        <section class="surface-card page-stack">
          <div>
            <p class="page-kicker">Create</p>
            <h3>Submit a new report request</h3>
            <p class="page-copy">This composer calls the report request POST endpoint with the selected definition, range, format, and JSON parameters.</p>
          </div>

          <div class="field">
            <label for="requestReportCode">Report definition</label>
            <select id="requestReportCode" [(ngModel)]="requestForm.reportCode" name="requestReportCode">
              @for (definition of definitions(); track definition.reportDefinitionId) {
                <option [value]="definition.reportCode">{{ definition.reportName }} · {{ definition.reportCode }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="requestOutputFormatId">Output format</label>
            <select id="requestOutputFormatId" [(ngModel)]="requestForm.outputFormatId" name="requestOutputFormatId">
              @for (format of outputFormats(); track format.outputFormatId) {
                <option [ngValue]="format.outputFormatId">{{ format.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="requestStatusIdCreate">Initial status</label>
            <select id="requestStatusIdCreate" [(ngModel)]="requestForm.reportStatusId" name="requestStatusIdCreate">
              @for (status of reportStatuses(); track status.reportStatusId) {
                <option [ngValue]="status.reportStatusId">{{ status.name }}</option>
              }
            </select>
          </div>

          <div class="filter-grid">
            <div class="field">
              <label for="requestFromDate">From date</label>
              <input id="requestFromDate" type="date" [(ngModel)]="requestForm.fromDate" name="requestFromDate" />
            </div>

            <div class="field">
              <label for="requestToDate">To date</label>
              <input id="requestToDate" type="date" [(ngModel)]="requestForm.toDate" name="requestToDate" />
            </div>
          </div>

          <div class="field">
            <label for="requestParameters">Parameters JSON</label>
            <textarea id="requestParameters" [(ngModel)]="requestForm.parametersJson" name="requestParameters" placeholder='{"branch":"north","includeFailures":false}'></textarea>
          </div>

          @if (submitMessage()) {
            <div class="success-banner">{{ submitMessage() }}</div>
          }

          <div class="actions-row">
            <button class="primary-button" type="button" (click)="createRequest()" [disabled]="isSubmitting() || !canSubmitRequest()">
              {{ isSubmitting() ? 'Submitting...' : 'Create request' }}
            </button>
          </div>
        </section>

        <section class="surface-card page-stack">
          <div class="filter-grid">
            <div class="field">
              <label for="requestedByUserId">Requested by user</label>
              <input id="requestedByUserId" [(ngModel)]="requestedByUserId" name="requestedByUserId" placeholder="e.g. 1" />
            </div>

            <div class="field">
              <label for="reportStatusId">Report status</label>
              <select id="reportStatusId" [(ngModel)]="reportStatusId" name="reportStatusId">
                <option value="">All statuses</option>
                @for (status of reportStatuses(); track status.reportStatusId) {
                  <option [value]="status.reportStatusId">{{ status.name }}</option>
                }
              </select>
            </div>

            <div class="field" style="justify-content: end;">
              <label>&nbsp;</label>
              <label class="toggle-field">
                <input type="checkbox" [(ngModel)]="pendingOnly" name="pendingOnly" />
                Pending only
              </label>
            </div>

            <div class="field" style="justify-content: end;">
              <label>&nbsp;</label>
              <div class="actions-row">
                <button class="secondary-button" type="button" (click)="loadRequests()">Refresh list</button>
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
                  <th>Request</th>
                  <th>Requested at</th>
                  <th>Status</th>
                  <th>Format</th>
                  <th>Generated file</th>
                </tr>
              </thead>
              <tbody>
                @for (request of requests(); track request.reportRequestId) {
                  <tr>
                    <td>
                      <strong>{{ request.reportCode }}</strong>
                      <div class="table-subtext">Request ID {{ request.reportRequestId }} · user {{ request.requestedByUserId }}</div>
                      @if (request.fromDate || request.toDate) {
                        <div class="table-subtext">Range: {{ request.fromDate || '...' }} to {{ request.toDate || '...' }}</div>
                      }
                    </td>
                    <td>{{ request.requestedAt | date: 'medium' }}</td>
                    <td>
                      <span class="status-pill" [attr.data-tone]="statusTone(request.reportStatus?.code)">
                        {{ request.reportStatus?.name || 'Unknown' }}
                      </span>
                      @if (request.failureReason) {
                        <div class="table-subtext" style="margin-top: 8px;">{{ request.failureReason }}</div>
                      }
                    </td>
                    <td>{{ request.outputFormat?.name || 'Unknown' }}</td>
                    <td>
                      @if (request.fileName || request.filePath) {
                        <strong>{{ request.fileName || 'Generated output' }}</strong>
                        <div class="table-subtext">{{ request.generatedAt ? (request.generatedAt | date: 'medium') : 'Not yet generated' }}</div>
                      } @else {
                        <span class="table-subtext">No output generated yet</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (!requests().length && !isLoading()) {
            <div class="empty-state">
              <p>No report requests matched the current filters.</p>
            </div>
          }
        </section>
      </div>
    </section>
  `
})
export class ReportRequestsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submitMessage = signal('');
  protected readonly requests = signal<ReportRequest[]>([]);
  protected readonly reportStatuses = signal<ReportStatus[]>([]);
  protected readonly definitions = signal<ReportDefinition[]>([]);
  protected readonly outputFormats = signal<OutputFormat[]>([]);

  protected requestedByUserId = '';
  protected reportStatusId = '';
  protected pendingOnly = false;
  protected requestForm: CreateReportRequestPayload = this.createRequestForm();

  constructor() {
    forkJoin({
      lookups: this.reportingApi.getLookups(true),
      definitions: this.reportingApi.getReportDefinitions(true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lookups, definitions }) => {
          this.reportStatuses.set(lookups.reportStatuses);
          this.outputFormats.set(lookups.outputFormats);
          this.definitions.set(definitions.filter((definition) => definition.isAdhocAllowed));
          this.hydrateRequestDefaults();
        }
      });

    this.loadRequests();
  }

  protected loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.reportingApi
      .getReportRequests({
        requestedByUserId: this.requestedByUserId ? Number(this.requestedByUserId) : null,
        reportStatusId: this.reportStatusId ? Number(this.reportStatusId) : null,
        pendingOnly: this.pendingOnly
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (requests) => {
          this.requests.set(requests);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load report requests.');
          this.isLoading.set(false);
        }
      });
  }

  protected createRequest(): void {
    if (!this.canSubmitRequest() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.submitMessage.set('');

    this.reportingApi
      .createReportRequest({
        ...this.requestForm,
        fromDate: this.requestForm.fromDate || null,
        toDate: this.requestForm.toDate || null,
        parametersJson: this.requestForm.parametersJson?.trim() || null,
        requestedByUserId: this.authService.session()?.userId ?? this.requestForm.requestedByUserId,
        createdBy: this.authService.session()?.userId ?? this.requestForm.requestedByUserId
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitMessage.set('Report request submitted successfully.');
          this.requestForm = this.createRequestForm();
          this.hydrateRequestDefaults();
          this.loadRequests();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message ?? 'Unable to create report request.');
        }
      });
  }

  protected canSubmitRequest(): boolean {
    return Boolean(this.requestForm.reportCode && this.requestForm.outputFormatId && this.requestForm.reportStatusId);
  }

  protected statusTone(statusCode?: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((statusCode || '').toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
        return 'danger';
      case 'PENDING':
      case 'INPROGRESS':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  private hydrateRequestDefaults(): void {
    if (!this.requestForm.reportCode && this.definitions().length) {
      this.requestForm.reportCode = this.definitions()[0].reportCode;
    }

    if (!this.requestForm.outputFormatId && this.outputFormats().length) {
      this.requestForm.outputFormatId = this.outputFormats()[0].outputFormatId;
    }

    if (!this.requestForm.reportStatusId && this.reportStatuses().length) {
      this.requestForm.reportStatusId =
        this.reportStatuses().find((status) => status.code.toUpperCase() === 'PENDING')?.reportStatusId ??
        this.reportStatuses()[0].reportStatusId;
    }
  }

  private createRequestForm(): CreateReportRequestPayload {
    return {
      reportCode: '',
      requestedByUserId: this.authService.session()?.userId ?? 0,
      fromDate: '',
      toDate: '',
      parametersJson: '',
      outputFormatId: 0,
      reportStatusId: 0,
      createdBy: this.authService.session()?.userId ?? null,
      correlationId: null
    };
  }
}