import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CreateReportDefinitionPayload,
  OutputFormat,
  ReportCategory,
  ReportDefinition
} from '../../core/models/reporting.models';
import { AuthService } from '../../core/services/auth.service';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-report-definitions-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Catalog</p>
          <h2 class="page-title">Report definitions</h2>
          <p class="page-copy">Create and review report definitions against the live backend catalog and lookup relationships.</p>
        </div>
      </header>

      <div class="split-grid">
        <section class="surface-card page-stack">
          <div>
            <p class="page-kicker">Create</p>
            <h3>Register a report definition</h3>
            <p class="page-copy">This form posts directly to the report definition endpoint and uses lookup-backed category and format choices.</p>
          </div>

          @if (submitMessage()) {
            <div class="success-banner">{{ submitMessage() }}</div>
          }

          <div class="field">
            <label for="reportCode">Report code</label>
            <input id="reportCode" [(ngModel)]="definitionForm.reportCode" name="reportCode" placeholder="CLM-001" />
          </div>

          <div class="field">
            <label for="reportName">Report name</label>
            <input id="reportName" [(ngModel)]="definitionForm.reportName" name="reportName" placeholder="Claims Daily Summary" />
          </div>

          <div class="field">
            <label for="definitionCategoryCreate">Category</label>
            <select id="definitionCategoryCreate" [(ngModel)]="definitionForm.categoryId" name="definitionCategoryCreate">
              @for (category of categories(); track category.categoryId) {
                <option [ngValue]="category.categoryId">{{ category.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="defaultFormatId">Default output format</label>
            <select id="defaultFormatId" [(ngModel)]="definitionForm.defaultFormatId" name="defaultFormatId">
              @for (format of outputFormats(); track format.outputFormatId) {
                <option [ngValue]="format.outputFormatId">{{ format.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="definitionDescription">Description</label>
            <textarea id="definitionDescription" [(ngModel)]="definitionForm.description" name="definitionDescription" placeholder="Describe the operational purpose of this report."></textarea>
          </div>

          <label class="toggle-field">
            <input type="checkbox" [(ngModel)]="definitionForm.isAdhocAllowed" name="isAdhocAllowed" />
            Allow ad-hoc execution
          </label>

          <label class="toggle-field">
            <input type="checkbox" [(ngModel)]="definitionForm.isScheduledAllowed" name="isScheduledAllowed" />
            Allow scheduling
          </label>

          <label class="toggle-field">
            <input type="checkbox" [(ngModel)]="definitionForm.isActive" name="definitionIsActive" />
            Set as active
          </label>

          <div class="actions-row">
            <button class="primary-button" type="button" (click)="createDefinition()" [disabled]="isSubmitting() || !canSubmitDefinition()">
              {{ isSubmitting() ? 'Creating...' : 'Create definition' }}
            </button>
          </div>
        </section>

        <section class="surface-card page-stack">
          <div class="filter-header">
            <div>
              <h3>Filter the catalog</h3>
              <p class="page-copy">Read directly from the live report definition collection.</p>
            </div>
            <div class="actions-row">
              <button class="secondary-button" type="button" (click)="loadDefinitions()">Refresh</button>
            </div>
          </div>

          <div class="filter-grid">
            <div class="field">
              <label for="definition-category">Category</label>
              <select id="definition-category" [(ngModel)]="selectedCategoryId" name="selectedCategoryId" (ngModelChange)="applyFilters()">
                <option value="">All categories</option>
                @for (category of categories(); track category.categoryId) {
                  <option [value]="category.categoryId">{{ category.name }}</option>
                }
              </select>
            </div>

            <div class="field" style="justify-content: end;">
              <label>&nbsp;</label>
              <label class="toggle-field">
                <input type="checkbox" [(ngModel)]="activeOnly" name="activeOnly" (ngModelChange)="loadDefinitions()" />
                Active definitions only
              </label>
            </div>
          </div>

          @if (errorMessage()) {
            <div class="alert">{{ errorMessage() }}</div>
          }

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Category</th>
                  <th>Default format</th>
                  <th>Modes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (definition of filteredDefinitions(); track definition.reportDefinitionId) {
                  <tr>
                    <td>
                      <strong>{{ definition.reportName }}</strong>
                      <div class="table-subtext">{{ definition.reportCode }}</div>
                      <div class="table-subtext">{{ definition.description || 'No description provided.' }}</div>
                    </td>
                    <td>{{ definition.category?.name || 'Unmapped category' }}</td>
                    <td>{{ definition.defaultFormat?.name || 'No default format' }}</td>
                    <td>
                      <div class="chip-list">
                        <span class="soft-badge">{{ definition.isAdhocAllowed ? 'Ad-hoc enabled' : 'Ad-hoc disabled' }}</span>
                        <span class="soft-badge">{{ definition.isScheduledAllowed ? 'Scheduling enabled' : 'Scheduling disabled' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [attr.data-tone]="definition.isActive ? 'success' : 'neutral'">
                        {{ definition.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (!filteredDefinitions().length && !isLoading()) {
            <div class="empty-state">
              <p>No report definitions matched the selected filters.</p>
            </div>
          }
        </section>
      </div>
    </section>
  `
})
export class ReportDefinitionsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submitMessage = signal('');
  protected readonly definitions = signal<ReportDefinition[]>([]);
  protected readonly filteredDefinitions = signal<ReportDefinition[]>([]);
  protected readonly categories = signal<ReportCategory[]>([]);
  protected readonly outputFormats = signal<OutputFormat[]>([]);

  protected activeOnly = true;
  protected selectedCategoryId = '';
  protected definitionForm: CreateReportDefinitionPayload = this.createDefinitionForm();

  constructor() {
    this.loadDefinitions();
  }

  protected loadDefinitions(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.submitMessage.set('');

    forkJoin({
      lookups: this.reportingApi.getLookups(true),
      definitions: this.reportingApi.getReportDefinitions(this.activeOnly)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lookups, definitions }) => {
          this.categories.set(lookups.reportCategories);
          this.outputFormats.set(lookups.outputFormats);
          this.hydrateDefinitionDefaults();
          this.definitions.set(definitions);
          this.applyFilters();
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load report definitions.');
          this.isLoading.set(false);
        }
      });
  }

  protected createDefinition(): void {
    if (!this.canSubmitDefinition() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.submitMessage.set('');

    this.reportingApi
      .createReportDefinition({
        ...this.definitionForm,
        description: this.definitionForm.description?.trim() || null,
        createdBy: this.authService.session()?.userId ?? null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitMessage.set('Report definition created successfully.');
          this.definitionForm = this.createDefinitionForm();
          this.hydrateDefinitionDefaults();
          this.loadDefinitions();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message ?? 'Unable to create report definition.');
        }
      });
  }

  protected applyFilters(): void {
    const selectedCategoryId = Number(this.selectedCategoryId);

    this.filteredDefinitions.set(
      this.definitions().filter((definition) => {
        if (selectedCategoryId && definition.categoryId !== selectedCategoryId) {
          return false;
        }

        return true;
      })
    );
  }

  protected canSubmitDefinition(): boolean {
    return Boolean(
      this.definitionForm.reportCode.trim() &&
        this.definitionForm.reportName.trim() &&
        this.definitionForm.categoryId &&
        this.definitionForm.defaultFormatId
    );
  }

  private hydrateDefinitionDefaults(): void {
    if (!this.definitionForm.categoryId && this.categories().length) {
      this.definitionForm.categoryId = this.categories()[0].categoryId;
    }

    if (!this.definitionForm.defaultFormatId && this.outputFormats().length) {
      this.definitionForm.defaultFormatId = this.outputFormats()[0].outputFormatId;
    }
  }

  private createDefinitionForm(): CreateReportDefinitionPayload {
    return {
      reportCode: '',
      reportName: '',
      categoryId: 0,
      description: '',
      defaultFormatId: 0,
      isScheduledAllowed: true,
      isAdhocAllowed: true,
      isActive: true,
      createdBy: this.authService.session()?.userId ?? null,
      correlationId: null
    };
  }
}