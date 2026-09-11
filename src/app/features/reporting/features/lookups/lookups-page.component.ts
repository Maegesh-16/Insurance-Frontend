import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LookupBundle } from '../../core/models/reporting.models';
import { ReportingApiService } from '../../core/services/reporting-api.service';

@Component({
  selector: 'app-lookups-page',
  imports: [CommonModule],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <p class="page-kicker">Reference Data</p>
          <h2 class="page-title">Lookup dictionaries</h2>
          <p class="page-copy">These lookup tables support every major reporting flow and are loaded as a shared frontend dependency.</p>
        </div>
        <div class="actions-row">
          <button class="secondary-button" type="button" (click)="loadLookups()">Refresh</button>
        </div>
      </header>

      @if (errorMessage()) {
        <div class="alert">{{ errorMessage() }}</div>
      }

      @if (lookups(); as data) {
        <div class="lookup-grid">
          <section class="surface-card">
            <div class="surface-card-header">
              <div>
                <p class="page-kicker">Output</p>
                <h3>Output formats</h3>
              </div>
              <span class="soft-badge">{{ data.outputFormats.length }} items</span>
            </div>
            <div class="chip-list" style="margin-top: 18px;">
              @for (item of data.outputFormats; track item.outputFormatId) {
                <article class="chip-card">
                  <strong>{{ item.name }}</strong>
                  <p class="table-subtext">{{ item.code }}</p>
                </article>
              }
            </div>
          </section>

          <section class="surface-card">
            <div class="surface-card-header">
              <div>
                <p class="page-kicker">Catalog</p>
                <h3>Report categories</h3>
              </div>
              <span class="soft-badge">{{ data.reportCategories.length }} items</span>
            </div>
            <div class="chip-list" style="margin-top: 18px;">
              @for (item of data.reportCategories; track item.categoryId) {
                <article class="chip-card">
                  <strong>{{ item.name }}</strong>
                  <p class="table-subtext">{{ item.code }}</p>
                </article>
              }
            </div>
          </section>

          <section class="surface-card">
            <div class="surface-card-header">
              <div>
                <p class="page-kicker">Lifecycle</p>
                <h3>Report statuses</h3>
              </div>
              <span class="soft-badge">{{ data.reportStatuses.length }} items</span>
            </div>
            <div class="chip-list" style="margin-top: 18px;">
              @for (item of data.reportStatuses; track item.reportStatusId) {
                <article class="chip-card">
                  <strong>{{ item.name }}</strong>
                  <p class="table-subtext">{{ item.code }}</p>
                </article>
              }
            </div>
          </section>

          <section class="surface-card">
            <div class="surface-card-header">
              <div>
                <p class="page-kicker">Workers</p>
                <h3>Execution statuses</h3>
              </div>
              <span class="soft-badge">{{ data.executionStatuses.length }} items</span>
            </div>
            <div class="chip-list" style="margin-top: 18px;">
              @for (item of data.executionStatuses; track item.executionStatusId) {
                <article class="chip-card">
                  <strong>{{ item.name }}</strong>
                  <p class="table-subtext">{{ item.code }}</p>
                </article>
              }
            </div>
          </section>
        </div>
      }
    </section>
  `
})
export class LookupsPageComponent {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');
  protected readonly lookups = signal<LookupBundle | null>(null);

  constructor() {
    this.loadLookups();
  }

  protected loadLookups(): void {
    this.errorMessage.set('');

    this.reportingApi
      .getLookups(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lookups) => this.lookups.set(lookups),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load lookup data.');
        }
      });
  }
}