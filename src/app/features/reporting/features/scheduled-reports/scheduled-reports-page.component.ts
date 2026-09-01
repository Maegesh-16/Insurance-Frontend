import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CreateScheduledReportPayload,
  OutputFormat,
  ReportDefinition,
  ScheduledReport
} from '../../core/models/reporting.models';
import { AuthService } from '../../core/services/auth.service';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-scheduled-reports-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Automation</p>
          <h2 class="page-title">Scheduled reports</h2>
          <p class="page-copy">Configure recurring report jobs and inspect the live schedule collection returned by the backend.</p>
        </div>
      </header>

      <div class="split-grid">
        <section class="surface-card page-stack">
          <div>
            <p class="page-kicker">Create</p>
            <h3>Schedule a recurring report</h3>
            <p class="page-copy">This form posts directly to the scheduling endpoint with cron configuration, recipients, and fixed parameters.</p>
          </div>

          <div class="field">
            <label for="scheduledDefinitionId">Report definition</label>
            <select id="scheduledDefinitionId" [(ngModel)]="scheduleForm.reportDefinitionId" name="scheduledDefinitionId">
              @for (definition of schedulableDefinitions(); track definition.reportDefinitionId) {
                <option [ngValue]="definition.reportDefinitionId">{{ definition.reportName }} · {{ definition.reportCode }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="scheduleName">Schedule name</label>
            <input id="scheduleName" [(ngModel)]="scheduleForm.scheduleName" name="scheduleName" placeholder="Daily claims report" />
          </div>

          <div class="field">
            <label for="cronExpression">Cron expression</label>
            <input id="cronExpression" [(ngModel)]="scheduleForm.cronExpression" name="cronExpression" placeholder="0 2 * * *" />
          </div>

          <div class="field">
            <label for="scheduledOutputFormatId">Output format</label>
            <select id="scheduledOutputFormatId" [(ngModel)]="scheduleForm.outputFormatId" name="scheduledOutputFormatId">
              @for (format of outputFormats(); track format.outputFormatId) {
                <option [ngValue]="format.outputFormatId">{{ format.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="scheduleRecipients">Recipients</label>
            <textarea id="scheduleRecipients" [(ngModel)]="recipientInput" name="scheduleRecipients" placeholder="ops@example.com, finance@example.com"></textarea>
          </div>

          <div class="field">
            <label for="scheduleParameters">Parameters JSON</label>
            <textarea id="scheduleParameters" [(ngModel)]="scheduleForm.parametersJson" name="scheduleParameters" placeholder='{"branch":"all"}'></textarea>
          </div>

          <label class="toggle-field">
            <input type="checkbox" [(ngModel)]="scheduleForm.isActive" name="scheduleIsActive" />
            Activate immediately
          </label>

          @if (submitMessage()) {
            <div class="success-banner">{{ submitMessage() }}</div>
          }

          <div class="actions-row">
            <button class="primary-button" type="button" (click)="createSchedule()" [disabled]="isSubmitting() || !canSubmitSchedule()">
              {{ isSubmitting() ? 'Saving...' : 'Create schedule' }}
            </button>
          </div>
        </section>

        <section class="surface-card page-stack">
          <div class="actions-row">
            <label class="toggle-field">
              <input type="checkbox" [(ngModel)]="activeOnly" name="activeOnly" (ngModelChange)="loadSchedules()" />
              Active schedules only
            </label>
            <button class="secondary-button" type="button" (click)="loadSchedules()">Refresh</button>
          </div>

          @if (errorMessage()) {
            <div class="alert">{{ errorMessage() }}</div>
          }

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Cron</th>
                  <th>Output</th>
                  <th>Runtime</th>
                  <th>Recipients</th>
                </tr>
              </thead>
              <tbody>
                @for (schedule of schedules(); track schedule.scheduledReportId) {
                  <tr>
                    <td>
                      <strong>{{ schedule.scheduleName }}</strong>
                      <div class="table-subtext">Definition {{ schedule.reportDefinitionId }}</div>
                      <span class="status-pill" [attr.data-tone]="schedule.isActive ? 'success' : 'neutral'" style="margin-top: 8px;">
                        {{ schedule.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td><span class="code-block">{{ schedule.cronExpression }}</span></td>
                    <td>{{ schedule.outputFormat?.name || 'Unknown format' }}</td>
                    <td>
                      <div>Next: {{ schedule.nextRunAt ? (schedule.nextRunAt | date: 'medium') : 'Not calculated' }}</div>
                      <div class="table-subtext">Last: {{ schedule.lastRunAt ? (schedule.lastRunAt | date: 'medium') : 'No runs yet' }}</div>
                    </td>
                    <td>{{ recipientsPreview(schedule.recipientsJson) }}</td>
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
export class ScheduledReportsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal('');
  protected readonly submitMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly schedules = signal<ScheduledReport[]>([]);
  protected readonly schedulableDefinitions = signal<ReportDefinition[]>([]);
  protected readonly outputFormats = signal<OutputFormat[]>([]);
  protected activeOnly = true;
  protected recipientInput = '';
  protected scheduleForm: CreateScheduledReportPayload = this.createScheduleForm();

  constructor() {
    forkJoin({
      lookups: this.reportingApi.getLookups(true),
      definitions: this.reportingApi.getReportDefinitions(true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lookups, definitions }) => {
          this.outputFormats.set(lookups.outputFormats);
          this.schedulableDefinitions.set(definitions.filter((definition) => definition.isScheduledAllowed));
          this.hydrateScheduleDefaults();
        }
      });

    this.loadSchedules();
  }

  protected loadSchedules(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getScheduledReports({ activeOnly: this.activeOnly })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (schedules) => this.schedules.set(schedules),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load scheduled reports.');
        }
      });
  }

  protected createSchedule(): void {
    if (!this.canSubmitSchedule() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.submitMessage.set('');

    this.reportingApi
      .createScheduledReport({
        ...this.scheduleForm,
        recipientsJson: this.buildRecipientsJson(),
        parametersJson: this.scheduleForm.parametersJson?.trim() || null,
        createdBy: this.authService.session()?.userId ?? null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitMessage.set('Scheduled report created successfully.');
          this.scheduleForm = this.createScheduleForm();
          this.recipientInput = '';
          this.hydrateScheduleDefaults();
          this.loadSchedules();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message ?? 'Unable to create scheduled report.');
        }
      });
  }

  protected canSubmitSchedule(): boolean {
    return Boolean(
      this.scheduleForm.reportDefinitionId &&
        this.scheduleForm.scheduleName.trim() &&
        this.scheduleForm.cronExpression.trim() &&
        this.scheduleForm.outputFormatId
    );
  }

  protected recipientsPreview(recipientsJson?: string | null): string {
    if (!recipientsJson) {
      return 'No recipients payload';
    }

    try {
      const parsed = JSON.parse(recipientsJson) as string[];
      return parsed.join(', ');
    } catch {
      return recipientsJson;
    }
  }

  private hydrateScheduleDefaults(): void {
    if (!this.scheduleForm.reportDefinitionId && this.schedulableDefinitions().length) {
      this.scheduleForm.reportDefinitionId = this.schedulableDefinitions()[0].reportDefinitionId;
    }

    if (!this.scheduleForm.outputFormatId && this.outputFormats().length) {
      this.scheduleForm.outputFormatId = this.outputFormats()[0].outputFormatId;
    }
  }

  private buildRecipientsJson(): string | null {
    const recipients = this.recipientInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return recipients.length ? JSON.stringify(recipients) : null;
  }

  private createScheduleForm(): CreateScheduledReportPayload {
    return {
      reportDefinitionId: 0,
      scheduleName: '',
      cronExpression: '',
      outputFormatId: 0,
      recipientsJson: null,
      parametersJson: '',
      lastRunAt: null,
      nextRunAt: null,
      isActive: true,
      createdBy: this.authService.session()?.userId ?? null,
      correlationId: null
    };
  }
}