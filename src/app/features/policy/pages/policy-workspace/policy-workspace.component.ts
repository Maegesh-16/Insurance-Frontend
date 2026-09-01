import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerResponse } from '../../../customer/models/customer.models';
import { CreatePolicyRequest, PolicyResponse, PolicyType } from '../../models/policy.models';
import { PolicyService } from '../../services/policy.service';
import { UpdatePolicyRequest } from '../../models/policy.models';

@Component({
  selector: 'app-policy-workspace',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './policy-workspace.component.html'
})
export class PolicyWorkspaceComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly policyService = inject(PolicyService);
  protected readonly policyTypes = signal<PolicyType[]>([]);
  protected readonly isLoadingTypes = signal(true);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal('');
  protected readonly savedPolicy = signal<PolicyResponse | null>(null);
  protected readonly lastSaveWasUpdate = signal(false);
  protected readonly editingPolicyId = signal<string | null>(null);
  protected readonly customer = this.getStoredCustomer();
  protected readonly selectedPolicyTypeId = signal('');
  protected readonly selectedPolicyType = computed(() => this.policyTypes().find((item) => item.id === this.selectedPolicyTypeId()) ?? null);
  protected readonly form = this.formBuilder.nonNullable.group({
    policyTypeId: ['', Validators.required],
    startDate: [this.toDateInput(new Date()), Validators.required],
    endDate: [this.toDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1))), Validators.required],
    coverageName: ['Core protection', Validators.required],
    coverageDescription: ['Essential protection for your selected policy.', Validators.required],
    sumInsured: [500000, [Validators.required, Validators.min(1)]],
    deductible: [0, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  constructor() {
    if (!this.customer) this.error.set('Complete your profile before creating a policy.');
    this.policyService.getTypes().subscribe({
      next: (types) => { this.policyTypes.set(types); this.isLoadingTypes.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isLoadingTypes.set(false); }
    });
    if (this.customer) this.policyService.getMine(this.customer.id).subscribe({
      next: (policies) => this.policies.set(policies),
      error: (error: HttpErrorResponse) => this.error.set(this.getErrorMessage(error))
    });
  }

  protected selectPolicyType(policyType: PolicyType): void {
    this.form.controls.policyTypeId.setValue(policyType.id);
    this.selectedPolicyTypeId.set(policyType.id);
  }

  protected editDraft(policy: PolicyResponse): void {
    const coverage = policy.coverages[0];
    if (policy.status !== 1 || !coverage) return;
    this.error.set('');
    this.savedPolicy.set(null);
    this.editingPolicyId.set(policy.id);
    this.selectedPolicyTypeId.set(policy.policyType.id);
    this.form.reset({
      policyTypeId: policy.policyType.id,
      startDate: policy.startDate,
      endDate: policy.endDate,
      coverageName: coverage.name,
      coverageDescription: coverage.description,
      sumInsured: coverage.sumInsured,
      deductible: coverage.deductible,
      remarks: policy.remarks ?? ''
    });
  }

  protected submit(): void {
    if (!this.customer || this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (value.startDate > value.endDate) { this.error.set('The policy end date must be after its start date.'); return; }
    const selectedType = this.selectedPolicyType();
    if (!selectedType) { this.error.set('Choose a policy type first.'); return; }
    this.error.set('');
    this.isSubmitting.set(true);
    const request = {
      customerId: this.customer.id,
      policyTypeId: selectedType.id,
      startDate: value.startDate,
      endDate: value.endDate,
      premiumAmount: 0,
      coverages: [{ name: value.coverageName, description: value.coverageDescription, sumInsured: value.sumInsured, deductible: value.deductible }],
      remarks: value.remarks.trim()
    };
    const editingPolicyId = this.editingPolicyId();
    const save = editingPolicyId
      ? this.policyService.update(editingPolicyId, { ...request, status: 1 } satisfies UpdatePolicyRequest)
      : this.policyService.create({ ...request, policyNumber: `SC-${Date.now()}`, remarks: request.remarks || null } satisfies CreatePolicyRequest);
    save.subscribe({
      next: (policy) => {
        this.savedPolicy.set(policy);
        this.lastSaveWasUpdate.set(!!editingPolicyId);
        this.policies.update((policies) => editingPolicyId ? policies.map((item) => item.id === policy.id ? policy : item) : [policy, ...policies]);
        this.editingPolicyId.set(null);
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  private getStoredCustomer(): CustomerResponse | null {
    try { return JSON.parse(localStorage.getItem('insurance.customer') || 'null') as CustomerResponse | null; } catch { return null; }
  }

  private toDateInput(value: Date): string { return value.toISOString().slice(0, 10); }

  protected policyStatusLabel(status: number): string {
    return ({ 1: 'Draft', 2: 'Pending approval', 3: 'Active', 4: 'Lapsed', 5: 'Cancelled', 6: 'Expired' } as Record<number, string>)[status] ?? 'Unknown';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach Policy Service. Start it on port 5182 and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'We could not create this policy. Please try again.';
  }
}