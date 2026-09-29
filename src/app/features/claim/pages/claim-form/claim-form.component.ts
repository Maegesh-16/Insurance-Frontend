import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerResponse } from '../../../customer/models/customer.models';
import { PaymentService } from '../../../payment/services/payment.service';
import { PolicyResponse } from '../../../policy/models/policy.models';
import { PolicyService } from '../../../policy/services/policy.service';
import { ClaimLookup, CreateClaimRequest } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

interface ClaimFormModel {
  policyId: string | null;
  customerId: string | null;
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
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './claim-form.component.html',
  styleUrl: '../claim-workspace.scss'
})
export class ClaimFormComponent {
  private readonly claimsApi = inject(ClaimApiService);
  private readonly policyService = inject(PolicyService);
  private readonly paymentService = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly claimTypes = signal<ClaimLookup[]>([]);
  protected readonly statuses = signal<ClaimLookup[]>([]);
  protected readonly priorities = signal<ClaimLookup[]>([]);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly isLoadingLookups = signal(false);
  protected readonly isLoadingPolicies = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');
  protected readonly selectedDocuments = signal<File[]>([]);
  protected readonly documentError = signal('');
  protected model: ClaimFormModel = this.newModel();
  protected readonly customer = this.getStoredCustomer();

  constructor() {
    this.model.customerId = this.customer?.id ?? null;
    this.loadLookups();
    this.loadPolicies();
  }

  protected loadLookups(): void {
    this.isLoadingLookups.set(true);
    this.error.set('');
    forkJoin({ types: this.claimsApi.getClaimTypes(), statuses: this.claimsApi.getClaimStatuses(), priorities: this.claimsApi.getPriorities() }).subscribe({
      next: ({ types, statuses, priorities }) => {
        this.claimTypes.set(types.filter((item) => item.isActive));
        this.statuses.set(statuses.filter((item) => item.isActive));
        this.priorities.set(priorities.filter((item) => item.isActive));
        this.model.claimStatusId = this.statuses().find((item) => item.code.toLowerCase() === 'submitted')?.id ?? null;
        this.isLoadingLookups.set(false);
      },
      error: () => { this.error.set('Unable to load the Claim Service lookup data. Confirm that your portal session is valid.'); this.isLoadingLookups.set(false); }
    });
  }

  protected loadPolicies(): void {
    if (!this.customer) {
      this.error.set('Complete your customer profile before submitting a claim.');
      return;
    }

    this.isLoadingPolicies.set(true);
    this.policyService.getMine(this.customer.id).subscribe({
      next: (policies) => {
        const activePolicies = policies.filter((policy) => policy.status === 3);
        if (activePolicies.length === 0) {
          this.policies.set([]);
          this.isLoadingPolicies.set(false);
          return;
        }

        forkJoin(activePolicies.map((policy) => this.paymentService.getPayments(policy.id))).subscribe({
          next: (paymentsByPolicy) => {
            const eligiblePolicies = activePolicies.filter((_, index) =>
              paymentsByPolicy[index].some((payment) => payment.status.toLowerCase() === 'completed'));
            this.policies.set(eligiblePolicies);
            const requestedPolicyId = this.route.snapshot.queryParamMap.get('policyId');
            if (requestedPolicyId && eligiblePolicies.some((policy) => policy.id === requestedPolicyId)) {
              this.model.policyId = requestedPolicyId;
            }
            this.isLoadingPolicies.set(false);
          },
          error: () => {
            this.error.set('Unable to verify premium payment status. Please try again.');
            this.isLoadingPolicies.set(false);
          }
        });
      },
      error: () => {
        this.error.set('Unable to load your policies. Please try again.');
        this.isLoadingPolicies.set(false);
      }
    });
  }

  protected selectDocuments(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const invalidFile = files.find((file) => !acceptedTypes.includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      this.selectedDocuments.set([]);
      this.documentError.set('Choose PDF, JPEG, or PNG files no larger than 10 MB each.');
      return;
    }

    this.selectedDocuments.set(files);
    this.documentError.set('');
  }

  protected submit(form: NgForm): void {
    if (form.invalid || this.model.policyId === null || this.model.customerId === null || this.model.claimTypeId === null || this.model.claimStatusId === null || this.model.priorityId === null || this.model.claimAmount === null) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.selectedDocuments().length === 0) {
      this.documentError.set('Attach at least one supporting document before submitting your claim.');
      return;
    }

    const policy = this.policies().find((item) => item.id === this.model.policyId);
    if (!policy || this.model.claimAmount <= 0) {
      this.error.set('Choose an active policy and enter a claim amount greater than zero.');
      return;
    }

    const incidentDate = new Date(`${this.model.incidentDate}T00:00:00`);
    const reportedAt = new Date(this.model.reportedAt);
    const policyStartDate = new Date(`${policy.startDate}T00:00:00`);
    const policyEndDate = new Date(`${policy.endDate}T23:59:59`);
    const sumInsured = policy.coverages.reduce((total, coverage) => total + coverage.sumInsured, 0);
    if (Number.isNaN(incidentDate.getTime()) || incidentDate > new Date() || incidentDate > reportedAt || incidentDate < policyStartDate || incidentDate > policyEndDate) {
      this.error.set('The incident date must be within the active policy period and cannot be after the report date.');
      return;
    }
    if (this.model.claimAmount > sumInsured) {
      this.error.set('The claim amount cannot exceed the policy sum insured.');
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
      currencyCode: 'INR',
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
      reportedAt: new Date().toISOString().slice(0, 16), claimAmount: null, currencyCode: 'INR', causeOfLoss: '', lossDescription: '', incidentLocation: ''
    };
  }

  private getStoredCustomer(): CustomerResponse | null {
    try { return JSON.parse(localStorage.getItem('insurance.customer') || 'null') as CustomerResponse | null; } catch { return null; }
  }
}