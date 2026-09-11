import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  CreateReportSnapshotPayload,
  ReportDefinition,
  ReportSnapshot
} from '../../core/models/reporting.models';
import { AuthService } from '../../core/services/auth.service';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-report-snapshots-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Archive</p>
          <h2 class="page-title">Report snapshots</h2>
          <p class="page-copy">Capture report snapshots, then query the latest or date-specific archive entries directly from the snapshot endpoints.</p>
        </div>
      </header>

      <div class="split-grid">
        <section class="surface-card page-stack">
          <div>
            <p class="page-kicker">Create</p>
            <h3>Archive a report snapshot</h3>
            <p class="page-copy">This form posts snapshot metadata and summary JSON to the reporting snapshot service.</p>
          </div>

          <div class="field">
            <label for="snapshotDefinition">Report definition</label>
            <select id="snapshotDefinition" [(ngModel)]="snapshotForm.reportCode" name="snapshotDefinition">
              @for (definition of definitions(); track definition.reportDefinitionId) {
                <option [value]="definition.reportCode">{{ definition.reportName }} · {{ definition.reportCode }}</option>
              }
            </select>
          </div>

          <div class="filter-grid">
            <div class="field">
              <label for="snapshotDateCreate">Snapshot date</label>
              <input id="snapshotDateCreate" type="date" [(ngModel)]="snapshotForm.snapshotDate" name="snapshotDateCreate" />
            </div>

            <div class="field">
              <label for="periodStartDate">Period start</label>
              <input id="periodStartDate" type="date" [(ngModel)]="snapshotForm.periodStartDate" name="periodStartDate" />
            </div>

            <div class="field">
              <label for="periodEndDate">Period end</label>
              <input id="periodEndDate" type="date" [(ngModel)]="snapshotForm.periodEndDate" name="periodEndDate" />
            </div>
          </div>

          <div class="field">
            <label for="versionLabel">Version label</label>
            <input id="versionLabel" [(ngModel)]="snapshotForm.versionLabel" name="versionLabel" placeholder="v1.0" />
          </div>

          <div class="field">
            <label for="summaryJson">Summary JSON</label>
            <textarea id="summaryJson" [(ngModel)]="snapshotForm.summaryJson" name="summaryJson" placeholder='{"totals":{"claims":1200,"amount":932000}}'></textarea>
          </div>

          @if (submitMessage()) {
            <div class="success-banner">{{ submitMessage() }}</div>
          }

          <div class="actions-row">
            <button class="primary-button" type="button" (click)="createSnapshot()" [disabled]="isSubmitting() || !canSubmitSnapshot()">
              {{ isSubmitting() ? 'Saving...' : 'Create snapshot' }}
            </button>
          </div>
        </section>

        <section class="surface-card page-stack">
          <div class="filter-grid">
            <div class="field">
              <label for="snapshotReportCode">Report code</label>
              <input id="snapshotReportCode" [(ngModel)]="reportCode" name="reportCode" placeholder="Optional report code" />
            </div>

            <div class="field">
              <label for="snapshotDateLookup">Lookup date</label>
              <input id="snapshotDateLookup" type="date" [(ngModel)]="snapshotLookupDate" name="snapshotDateLookup" />
            </div>

            <div class="field" style="justify-content: end;">
              <label>&nbsp;</label>
              <div class="actions-row">
                <button class="secondary-button" type="button" (click)="loadSnapshots()">Load collection</button>
                <button class="secondary-button" type="button" (click)="loadLatestSnapshot()" [disabled]="!reportCode.trim()">Latest</button>
                <button class="secondary-button" type="button" (click)="loadSnapshotByDate()" [disabled]="!reportCode.trim() || !snapshotLookupDate">By date</button>
              </div>
            </div>
          </div>

          @if (errorMessage()) {
            <div class="alert">{{ errorMessage() }}</div>
          }

          @if (highlightedSnapshot()) {
            <div class="surface-card" style="padding: 18px; background: rgba(255,255,255,0.56); box-shadow: none;">
              <div class="surface-card-header">
                <div>
                  <p class="page-kicker">Focused Snapshot</p>
                  <h3>{{ highlightedSnapshot()?.reportCode }} · {{ highlightedSnapshot()?.snapshotDate }}</h3>
                </div>
                <span class="soft-badge">{{ highlightedSnapshot()?.versionLabel || 'No version label' }}</span>
              </div>
              <p class="page-copy" style="margin-top: 12px;">{{ previewSummary(highlightedSnapshot()?.summaryJson || '') }}</p>
            </div>
          }

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Snapshot</th>
                  <th>Period</th>
                  <th>Generated</th>
                  <th>Version</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                @for (snapshot of snapshots(); track snapshot.reportSnapshotId) {
                  <tr>
                    <td>
                      <strong>{{ snapshot.reportCode }}</strong>
                      <div class="table-subtext">Snapshot ID {{ snapshot.reportSnapshotId }}</div>
                      <div class="table-subtext">{{ snapshot.snapshotDate }}</div>
                    </td>
                    <td>{{ snapshot.periodStartDate }} to {{ snapshot.periodEndDate }}</td>
                    <td>{{ snapshot.generatedAt | date: 'medium' }}</td>
                    <td>{{ snapshot.versionLabel || 'No version label' }}</td>
                    <td><span class="code-block">{{ previewSummary(snapshot.summaryJson) }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `
})
export class ReportSnapshotsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal('');
  protected readonly submitMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly snapshots = signal<ReportSnapshot[]>([]);
  protected readonly highlightedSnapshot = signal<ReportSnapshot | null>(null);
  protected readonly definitions = signal<ReportDefinition[]>([]);
  protected reportCode = '';
  protected snapshotLookupDate = '';
  protected snapshotForm: CreateReportSnapshotPayload = this.createSnapshotForm();

  constructor() {
    this.reportingApi
      .getReportDefinitions(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definitions) => {
          this.definitions.set(definitions);
          if (!this.snapshotForm.reportCode && definitions.length) {
            this.snapshotForm.reportCode = definitions[0].reportCode;
          }
        }
      });

    this.loadSnapshots();
  }

  protected loadSnapshots(): void {
    this.errorMessage.set('');
    this.highlightedSnapshot.set(null);

    this.reportingApi
      .getReportSnapshots(this.reportCode || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshots) => this.snapshots.set(snapshots),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load report snapshots.');
        }
      });
  }

  protected createSnapshot(): void {
    if (!this.canSubmitSnapshot() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.submitMessage.set('');

    this.reportingApi
      .createReportSnapshot({
        ...this.snapshotForm,
        generatedAt: new Date().toISOString(),
        generatedByUserId: this.authService.session()?.userId ?? null,
        createdBy: this.authService.session()?.userId ?? null,
        versionLabel: this.snapshotForm.versionLabel?.trim() || null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          this.isSubmitting.set(false);
          this.submitMessage.set('Report snapshot created successfully.');
          this.reportCode = snapshot.reportCode;
          this.snapshotForm = this.createSnapshotForm();
          if (this.definitions().length) {
            this.snapshotForm.reportCode = this.definitions()[0].reportCode;
          }
          this.highlightedSnapshot.set(snapshot);
          this.loadSnapshots();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message ?? 'Unable to create report snapshot.');
        }
      });
  }

  protected loadLatestSnapshot(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getLatestReportSnapshot(this.reportCode.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => this.highlightedSnapshot.set(snapshot),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load the latest snapshot for that report code.');
        }
      });
  }

  protected loadSnapshotByDate(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getReportSnapshotByDate(this.reportCode.trim(), this.snapshotLookupDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => this.highlightedSnapshot.set(snapshot),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load the snapshot for the selected report code and date.');
        }
      });
  }

  protected canSubmitSnapshot(): boolean {
    return Boolean(
      this.snapshotForm.reportCode &&
        this.snapshotForm.snapshotDate &&
        this.snapshotForm.periodStartDate &&
        this.snapshotForm.periodEndDate &&
        this.snapshotForm.summaryJson.trim()
    );
  }

  protected previewSummary(summaryJson: string): string {
    return summaryJson.length > 80 ? `${summaryJson.slice(0, 80)}...` : summaryJson;
  }

  private createSnapshotForm(): CreateReportSnapshotPayload {
    const today = new Date().toISOString().slice(0, 10);

    return {
      reportCode: '',
      snapshotDate: today,
      periodStartDate: today,
      periodEndDate: today,
      generatedAt: new Date().toISOString(),
      generatedByUserId: this.authService.session()?.userId ?? null,
      summaryJson: '',
      versionLabel: '',
      createdBy: this.authService.session()?.userId ?? null,
      correlationId: null
    };
  }
}