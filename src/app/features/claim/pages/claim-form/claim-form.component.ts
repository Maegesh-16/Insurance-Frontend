import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClaimLookup, CreateClaimRequest } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

interface ClaimFormModel {
  policyId: number | null;
  customerId: number | null;
  claimNumber: string;
  claimTypeId: number | null;
  claimStatusId: number | null;
  priorityId: number | null;
  incidentDate: string;
  reportedAt: string;
  claimAmount: number | null;
  currencyCode: string;
  causeOfLoss: string;
  lossDescription: string;
  incidentLocation: string;
}

@Component({
  selector: 'app-claim-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './claim-form.component.html',
  styleUrl: '../claim-workspace.scss'
})
export class ClaimFormComponent {
  private readonly claimsApi = inject(ClaimApiService);
  private readonly router = inject(Router);
  protected readonly claimTypes = signal<ClaimLookup[]>([]);
  protected readonly statuses = signal<ClaimLookup[]>([]);
  protected readonly priorities = signal<ClaimLookup[]>([]);
  protected readonly isLoadingLookups = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');
  protected model: ClaimFormModel = this.newModel();

  constructor() { this.loadLookups(); }

  protected loadLookups(): void {
    this.isLoadingLookups.set(true);
    this.error.set('');
    forkJoin({ types: this.claimsApi.getClaimTypes(), statuses: this.claimsApi.getClaimStatuses(), priorities: this.claimsApi.getPriorities() }).subscribe({
      next: ({ types, statuses, priorities }) => {
        this.claimTypes.set(types.filter((item) => item.isActive));
        this.statuses.set(statuses.filter((item) => item.isActive));
        this.priorities.set(priorities.filter((item) => item.isActive));
        this.isLoadingLookups.set(false);
      },
      error: () => { this.error.set('Unable to load the Claim Service lookup data. Confirm that your portal session is valid.'); this.isLoadingLookups.set(false); }
    });
  }

  protected submit(form: NgForm): void {
    if (form.invalid || this.model.policyId === null || this.model.customerId === null || this.model.claimTypeId === null || this.model.claimStatusId === null || this.model.priorityId === null || this.model.claimAmount === null) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    const request: CreateClaimRequest = {
      policyId: this.model.policyId,
      customerId: this.model.customerId,
      claimNumber: this.model.claimNumber.trim(),
      claimTypeId: this.model.claimTypeId,
      claimStatusId: this.model.claimStatusId,
      incidentDate: this.model.incidentDate,
      reportedAt: new Date(this.model.reportedAt).toISOString(),
      claimAmount: this.model.claimAmount,
      currencyCode: this.model.currencyCode.toUpperCase(),
      causeOfLoss: this.model.causeOfLoss.trim(),
      lossDescription: this.model.lossDescription.trim(),
      priorityId: this.model.priorityId,
      incidentLocation: this.model.incidentLocation.trim() || null
    };

    this.claimsApi.createClaim(request).subscribe({
      next: (claim) => void this.router.navigate(['/claims', claim.claimId]),
      error: (error) => { this.error.set(error.error?.detail || error.error?.title || 'The Claim Service could not create this claim.'); this.isSaving.set(false); }
    });
  }

  private newModel(): ClaimFormModel {
    return {
      policyId: null, customerId: null, claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      claimTypeId: null, claimStatusId: null, priorityId: null, incidentDate: new Date().toISOString().slice(0, 10),
      reportedAt: new Date().toISOString().slice(0, 16), claimAmount: null, currencyCode: 'USD', causeOfLoss: '', lossDescription: '', incidentLocation: ''
    };
  }
}