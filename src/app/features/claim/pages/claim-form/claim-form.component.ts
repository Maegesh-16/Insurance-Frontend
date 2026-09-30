import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, switchMap } from 'rxjs';
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
  documentFormat: 'pdf' | 'jpeg' | 'png' | null;
  documentTypeId: number | null;
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
  protected readonly supportedDocumentFormats = [
    { value: 'pdf', label: 'PDF (.pdf)', mimeTypes: ['application/pdf'] },
    { value: 'jpeg', label: 'JPEG (.jpg, .jpeg)', mimeTypes: ['image/jpeg'] },
    { value: 'png', label: 'PNG (.png)', mimeTypes: ['image/png'] }
  ] as const;

  private readonly claimsApi = inject(ClaimApiService);
  private readonly policyService = inject(PolicyService);
  private readonly paymentService = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly claimTypes = signal<ClaimLookup[]>([]);
  protected readonly statuses = signal<ClaimLookup[]>([]);
  protected readonly priorities = signal<ClaimLookup[]>([]);
  protected readonly documentTypes = signal<ClaimLookup[]>([]);
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
    forkJoin({ types: this.claimsApi.getClaimTypes(), statuses: this.claimsApi.getClaimStatuses(), priorities: this.claimsApi.getPriorities(), documentTypes: this.claimsApi.getDocumentTypes() }).subscribe({
      next: ({ types, statuses, priorities, documentTypes }) => {
        this.claimTypes.set(types.filter((item) => item.isActive));
        this.statuses.set(statuses.filter((item) => item.isActive));
        this.priorities.set(priorities.filter((item) => item.isActive));
        this.documentTypes.set(documentTypes.filter((item) => item.isActive));
        this.model.claimStatusId = this.statuses().find((item) => item.code.toLowerCase() === 'submitted')?.id ?? null;
        this.model.priorityId = this.priorities().find((item) => item.code.toLowerCase() === 'normal')?.id ?? null;
        this.applyPolicyDefaults();
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
            this.applyPolicyDefaults();
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
    const selectedFormat = this.supportedDocumentFormats.find((format) => format.value === this.model.documentFormat);
    const invalidFile = files.find((file) =>
      !selectedFormat?.mimeTypes.some((mimeType) => mimeType === file.type) || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      this.selectedDocuments.set([]);
      this.documentError.set(selectedFormat
        ? `Choose only ${selectedFormat.label} files no larger than 10 MB each.`
        : 'Choose a document format before selecting files.');
      return;
    }

    this.selectedDocuments.set(files);
    this.documentError.set('');
  }

  protected selectDocumentFormat(): void {
    const documentType = this.documentTypes().find((item) => this.matchesDocumentFormat(item, this.model.documentFormat))
      ?? this.documentTypes()[0];
    this.model.documentTypeId = documentType?.id ?? null;
    this.selectedDocuments.set([]);
    this.documentError.set('');
  }

  protected selectPolicy(): void {
    this.applyPolicyDefaults();
  }

  protected selectedPolicy(): PolicyResponse | undefined {
    return this.policies().find((policy) => policy.id === this.model.policyId);
  }

  protected selectedClaimType(): ClaimLookup | undefined {
    return this.claimTypes().find((claimType) => claimType.id === this.model.claimTypeId);
  }

  protected selectedStatus(): ClaimLookup | undefined {
    return this.statuses().find((status) => status.id === this.model.claimStatusId);
  }

  protected selectedPriority(): ClaimLookup | undefined {
    return this.priorities().find((priority) => priority.id === this.model.priorityId);
  }

  protected policySumInsured(policy: PolicyResponse): number {
    return policy.coverages.reduce((total, coverage) => total + coverage.sumInsured, 0);
  }

  protected submit(form: NgForm): void {
    if (form.invalid || this.model.policyId === null || this.model.customerId === null || this.model.claimTypeId === null || this.model.claimStatusId === null || this.model.priorityId === null || this.model.documentTypeId === null || this.model.claimAmount === null) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.selectedDocuments().length === 0) {
      this.documentError.set('Attach at least one supporting document before submitting your claim.');
      return;
    }

    const policy = this.selectedPolicy();
    if (!policy || this.model.claimAmount <= 0) {
      this.error.set('Choose an active policy and enter a claim amount greater than zero.');
      return;
    }

    const incidentDate = new Date(`${this.model.incidentDate}T00:00:00`);
    const reportedAt = new Date();
    const policyStartDate = new Date(`${policy.startDate}T00:00:00`);
    const policyEndDate = new Date(`${policy.endDate}T23:59:59`);
    const sumInsured = this.policySumInsured(policy);
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
    this.model.reportedAt = reportedAt.toISOString().slice(0, 16);
    const request: CreateClaimRequest = {
      policyId: this.model.policyId,
      customerId: this.model.customerId,
      claimNumber: this.model.claimNumber.trim(),
      claimTypeId: this.model.claimTypeId,
      claimStatusId: this.model.claimStatusId,
      incidentDate: this.model.incidentDate,
      reportedAt: reportedAt.toISOString(),
      claimAmount: this.model.claimAmount,
      currencyCode: 'INR',
      causeOfLoss: this.model.causeOfLoss.trim(),
      lossDescription: this.model.lossDescription.trim(),
      priorityId: this.model.priorityId,
      incidentLocation: this.model.incidentLocation.trim() || null
    };

    let createdClaimId: number | null = null;
    this.claimsApi.createClaim(request).pipe(
      switchMap((claim) => {
        createdClaimId = claim.claimId;
        return forkJoin(this.selectedDocuments().map((file) => this.claimsApi.uploadDocument(claim.claimId, this.model.documentTypeId!, file))).pipe(
          map(() => claim));
      })
    ).subscribe({
      next: (claim) => void this.router.navigate(['/claims', claim.claimId]),
      error: (error) => {
        this.error.set(createdClaimId
          ? `Claim ${createdClaimId} was created, but a supporting document could not be uploaded. Please contact support before submitting another claim.`
          : error.error?.detail || error.error?.title || 'The Claim Service could not create the claim.');
        this.isSaving.set(false);
      }
    });
  }

  private newModel(): ClaimFormModel {
    return {
      policyId: null, customerId: null, claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      claimTypeId: null, claimStatusId: null, priorityId: null, documentFormat: null, documentTypeId: null, incidentDate: new Date().toISOString().slice(0, 10),
      reportedAt: new Date().toISOString().slice(0, 16), claimAmount: null, currencyCode: 'INR', causeOfLoss: '', lossDescription: '', incidentLocation: ''
    };
  }

  private getStoredCustomer(): CustomerResponse | null {
    try { return JSON.parse(localStorage.getItem('insurance.customer') || 'null') as CustomerResponse | null; } catch { return null; }
  }

  private applyPolicyDefaults(): void {
    const policy = this.selectedPolicy();
    if (!policy) {
      this.model.claimTypeId = null;
      return;
    }

    const policyType = `${policy.policyType.code} ${policy.policyType.name}`.toLowerCase();
    const claimTypeCode = policyType.includes('auto') || policyType.includes('motor') || policyType.includes('vehicle')
      ? 'auto'
      : policyType.includes('health') || policyType.includes('medical')
        ? 'health'
        : policyType.includes('property') || policyType.includes('home')
          ? 'property'
          : policyType.includes('life')
            ? 'life'
            : null;

    this.model.claimTypeId = claimTypeCode
      ? this.claimTypes().find((claimType) => claimType.code.toLowerCase() === claimTypeCode)?.id ?? null
      : null;
  }

  private matchesDocumentFormat(documentType: ClaimLookup, format: ClaimFormModel['documentFormat']): boolean {
    const value = `${documentType.code} ${documentType.name}`.toLowerCase();
    return (format === 'pdf' && value.includes('pdf')) ||
      (format === 'jpeg' && (value.includes('jpeg') || value.includes('jpg'))) ||
      (format === 'png' && value.includes('png'));
  }
}