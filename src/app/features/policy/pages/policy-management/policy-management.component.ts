import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreatePolicyRequest, PolicyResponse, UpdatePolicyRequest } from '../../models/policy.models';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-management',
  imports: [CurrencyPipe, DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './policy-management.component.html'
})
export class PolicyManagementComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly policyService = inject(PolicyService);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly policyTypes = signal<PolicyResponse['policyType'][]>([]);
  protected readonly availablePolicyTypes = computed(() => this.policyTypes().filter((policyType) => policyType.isAvailable !== false));
  protected readonly loading = signal(true);
  protected readonly savingPolicyId = signal<string | null>(null);
  protected readonly selectedPolicy = signal<PolicyResponse | null>(null);
  protected readonly editingPolicy = signal<PolicyResponse | null>(null);
  protected readonly targetPolicyStatus = signal(2);
  protected readonly underwritingRemarks = signal('');
  protected readonly error = signal('');
  protected readonly isApplicationsView = this.route.snapshot.data['view'] === 'applications';
  protected readonly isIssuedPoliciesView = this.route.snapshot.data['view'] === 'issued';
  protected readonly editorForm = this.formBuilder.nonNullable.group({
    customerId: ['', Validators.required],
    policyTypeId: ['', Validators.required],
    startDate: [this.toDateInput(new Date()), Validators.required],
    endDate: [this.toDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1))), Validators.required],
    coverageName: ['Core protection', Validators.required],
    coverageDescription: ['Essential protection for this policy.', Validators.required],
    sumInsured: [500000, [Validators.required, Validators.min(1)]],
    deductible: [0, [Validators.required, Validators.min(0)]],
    status: [1, Validators.required],
    remarks: ['']
  });

  constructor() {
    this.loadPolicies();
    this.loadPolicyTypes();
  }

  protected openNewPolicy(): void {
    this.error.set('');
    this.editingPolicy.set(null);
    this.editorForm.reset({
      customerId: '', policyTypeId: '', startDate: this.toDateInput(new Date()),
      endDate: this.toDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
      coverageName: 'Core protection', coverageDescription: 'Essential protection for this policy.',
      sumInsured: 500000, deductible: 0, status: 1, remarks: ''
    });
  }

  protected openPolicyEditor(policy: PolicyResponse): void {
    const coverage = policy.coverages[0];
    if (!coverage) { this.error.set('This policy has no coverage record to edit.'); return; }
    this.error.set('');
    this.editingPolicy.set(policy);
    this.editorForm.reset({
      customerId: policy.customerId, policyTypeId: policy.policyTypeId,
      startDate: policy.startDate, endDate: policy.endDate,
      coverageName: coverage.name, coverageDescription: coverage.description,
      sumInsured: coverage.sumInsured, deductible: coverage.deductible,
      status: policy.status, remarks: policy.remarks ?? ''
    });
  }

  protected closePolicyEditor(): void { this.editingPolicy.set(null); }

  protected savePolicy(): void {
    if (this.editorForm.invalid) { this.editorForm.markAllAsTouched(); return; }
    const value = this.editorForm.getRawValue();
    if (value.startDate > value.endDate) { this.error.set('The policy end date must be after its start date.'); return; }
    const editingPolicy = this.editingPolicy();
    const baseRequest = {
      customerId: value.customerId.trim(), policyTypeId: value.policyTypeId,
      startDate: value.startDate, endDate: value.endDate,
      coverages: [{ name: value.coverageName.trim(), description: value.coverageDescription.trim(), sumInsured: value.sumInsured, deductible: value.deductible }]
    };
    this.error.set('');
    this.savingPolicyId.set(editingPolicy?.id ?? 'new');
    const save = editingPolicy
      ? this.policyService.update(editingPolicy.id, { ...baseRequest, status: value.status, remarks: value.remarks.trim() } satisfies UpdatePolicyRequest)
      : this.policyService.create({ ...baseRequest, remarks: value.remarks.trim() || null } satisfies CreatePolicyRequest);
    save.subscribe({
      next: (policy) => {
        this.policies.update((policies) => editingPolicy ? policies.map((item) => item.id === policy.id ? policy : item) : [policy, ...policies]);
        this.editingPolicy.set(null);
        this.savingPolicyId.set(null);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingPolicyId.set(null); }
    });
  }

  protected openPolicyDecision(policy: PolicyResponse): void {
    const nextStatuses = this.nextPolicyStatuses(policy.status);
    if (nextStatuses.length === 0) return;
    this.selectedPolicy.set(policy);
    this.targetPolicyStatus.set(nextStatuses[0]);
    this.underwritingRemarks.set('');
  }

  protected savePolicyDecision(): void {
    const policy = this.selectedPolicy();
    const remarks = this.underwritingRemarks().trim();
    if (!policy || !remarks) return;
    this.savingPolicyId.set(policy.id);
    this.policyService.transitionStatus(policy.id, { status: this.targetPolicyStatus(), remarks }).subscribe({
      next: (updatedPolicy) => {
        this.policies.update((policies) => policies.map((item) => item.id === updatedPolicy.id ? updatedPolicy : item));
        this.selectedPolicy.set(null);
        this.savingPolicyId.set(null);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingPolicyId.set(null); }
    });
  }

  protected policyStatusLabel(status: number): string {
    return ({ 1: 'Draft', 2: 'Pending approval', 3: 'Active', 4: 'Lapsed', 5: 'Cancelled', 6: 'Expired' } as Record<number, string>)[status] ?? 'Unknown';
  }

  protected nextPolicyStatuses(status: number): number[] {
    return ({ 1: [2, 5], 2: [3, 5], 3: [4, 5, 6] } as Record<number, number[]>)[status] ?? [];
  }

  private loadPolicies(): void {
    this.loading.set(true);
    timer(0, 30000).pipe(
      switchMap(() => this.policyService.getAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (policies) => {
        const visiblePolicies = this.isIssuedPoliciesView
          ? policies.filter((policy) => policy.status === 3)
          : this.isApplicationsView
            ? policies.filter((policy) => policy.status === 1 || policy.status === 2)
            : policies;
        this.policies.set(visiblePolicies);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.loading.set(false); }
    });
  }

  private loadPolicyTypes(): void {
    this.policyService.getTypes().subscribe({
      next: (policyTypes) => this.policyTypes.set(policyTypes),
      error: (error: HttpErrorResponse) => this.error.set(this.message(error))
    });
  }

  private toDateInput(value: Date): string { return value.toISOString().slice(0, 10); }

  private message(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') return error.error.detail;
    return error.status === 403 ? 'Your account does not have policy-management permission.' : 'Policy management is unavailable. Confirm the Policy Service is deployed and reachable.';
  }
}