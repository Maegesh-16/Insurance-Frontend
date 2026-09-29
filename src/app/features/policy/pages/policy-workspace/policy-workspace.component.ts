import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerResponse } from '../../../customer/models/customer.models';
import { installmentPremium, PREMIUM_FREQUENCIES, PremiumFrequency, PremiumPlan, PremiumSchedule } from '../../../premium/models/premium.models';
import { PremiumService } from '../../../premium/services/premium.service';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly premiumService = inject(PremiumService);
  protected readonly policyTypes = signal<PolicyType[]>([]);
  protected readonly availablePolicyTypes = computed(() => this.policyTypes().filter((policyType) => policyType.isAvailable !== false));
  protected readonly isLoadingTypes = signal(true);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly applications = computed(() => this.policies().filter((policy) => [1, 2, 5].includes(policy.status)));
  protected readonly activePolicies = computed(() => this.policies().filter((policy) => policy.status === 3));
  protected readonly premiumPlans = signal<PremiumPlan[]>([]);
  protected readonly paymentSchedules = signal<ReadonlyMap<string, PremiumSchedule[]>>(new Map());
  protected readonly isLoadingPayments = signal(false);
  protected readonly isCreatingSchedule = signal(false);
  protected readonly scheduleSelectionPolicy = signal<PolicyResponse | null>(null);
  protected readonly selectedPaymentFrequency = signal<PremiumFrequency | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly submittingApplicationId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly savedPolicy = signal<PolicyResponse | null>(null);
  protected readonly lastSaveWasUpdate = signal(false);
  protected readonly editingPolicyId = signal<string | null>(null);
  protected readonly view = (this.route.snapshot.data['view'] as 'products' | 'applications' | 'policies' | undefined) ?? 'products';
  protected readonly customer = this.getStoredCustomer();
  protected readonly selectedPolicyTypeId = signal('');
  protected readonly selectedPolicyType = computed(() => this.policyTypes().find((item) => item.id === this.selectedPolicyTypeId()) ?? null);
  protected readonly minimumStartDate = this.toDateInput(new Date());
  protected readonly form = this.formBuilder.nonNullable.group({
    policyTypeId: ['', Validators.required],
    startDate: [this.minimumStartDate, Validators.required],
    endDate: [this.toDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1))), Validators.required],
    coverageName: ['Core protection', Validators.required],
    coverageDescription: ['Essential protection for your selected policy.', Validators.required],
    sumInsured: [500000, [Validators.required, Validators.min(1)]],
    deductible: [0, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  constructor() {
    if (!this.customer) this.error.set('Complete your profile before creating a policy.');
    if (this.view === 'products') this.loadPolicyTypes();
    else this.isLoadingTypes.set(false);
    if (this.customer) this.policyService.getMine(this.customer.id).subscribe({
      next: (policies) => {
        this.policies.set(policies);
        if (this.view === 'policies') this.loadPaymentStatuses(policies);
      },
      error: (error: HttpErrorResponse) => this.error.set(this.getErrorMessage(error))
    });
  }

  protected selectPolicyType(policyType: PolicyType): void {
    this.form.controls.policyTypeId.setValue(policyType.id);
    this.selectedPolicyTypeId.set(policyType.id);
    const coverageDefaults = this.getCoverageDefaults(policyType.code);
    this.form.patchValue(coverageDefaults);
    this.scrollToApplicationForm();
  }

  protected policyBenefits(policyType: PolicyType): string[] {
    if (policyType.benefits?.length) return policyType.benefits;
    return ({
      AUTO_COMPREHENSIVE: ['Accidental damage cover', 'Theft and fire protection', 'Third-party liability cover'],
      HEALTH_STANDARD: ['In-patient hospitalisation', 'Pre- and post-hospitalisation expenses', 'Cashless treatment network'],
      LIFE_PROTECT: ['Life cover for your nominee', 'Long-term financial protection', 'Flexible premium payment options'],
    } as Record<string, string[]>)[policyType.code] ?? ['Coverage tailored to your selected policy terms'];
  }

  protected editDraft(policy: PolicyResponse): void {
    const coverage = policy.coverages[0];
    if (policy.status !== 1 || !coverage) return;
    const scrollToForm = () => this.scrollToApplicationForm();
    if (this.policyTypes().length === 0) this.loadPolicyTypes(scrollToForm);
    else scrollToForm();
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

  protected checkout(policyId: string, scheduleId: string): void {
    void this.router.navigate(['/customer/checkout', policyId], { queryParams: { scheduleId } });
  }

  protected availablePaymentPlans(policy: PolicyResponse): PremiumPlan[] {
    return this.premiumPlans().filter((plan) => plan.policyTypeId === policy.policyTypeId);
  }

  protected availablePaymentFrequencies(policy: PolicyResponse): PremiumFrequency[] {
    const configuredFrequencies = this.availablePaymentPlans(policy).map((plan) => plan.frequency as PremiumFrequency);
    return configuredFrequencies.length > 0 ? configuredFrequencies : PREMIUM_FREQUENCIES.map((item) => item.value);
  }

  protected estimatedInstallmentAmount(policy: PolicyResponse, frequency: PremiumFrequency): number {
    return installmentPremium(policy.premiumAmount, frequency);
  }

  protected openScheduleSelection(policy: PolicyResponse): void {
    this.error.set('');
    this.scheduleSelectionPolicy.set(policy);
    this.selectedPaymentFrequency.set(this.availablePaymentPlans(policy)[0]?.frequency as PremiumFrequency ?? null);
  }

  protected closeScheduleSelection(): void {
    if (this.isCreatingSchedule()) return;
    this.scheduleSelectionPolicy.set(null);
    this.selectedPaymentFrequency.set(null);
  }

  protected choosePaymentFrequency(frequency: string): void {
    if (PREMIUM_FREQUENCIES.some((item) => item.value === frequency)) {
      this.selectedPaymentFrequency.set(frequency as PremiumFrequency);
    }
  }

  protected paymentFrequencyLabel(frequency: string): string {
    return PREMIUM_FREQUENCIES.find((item) => item.value === frequency)?.label ?? frequency;
  }

  protected createSchedule(): void {
    const policy = this.scheduleSelectionPolicy();
    const frequency = this.selectedPaymentFrequency();
    if (!policy || !frequency) return;

    this.isCreatingSchedule.set(true);
    this.error.set('');
    this.premiumService.createSchedules({ policyId: policy.id, frequency }).subscribe({
      next: (schedules) => {
        this.paymentSchedules.update((schedulesByPolicy) => {
          const updatedSchedules = new Map(schedulesByPolicy);
          updatedSchedules.set(policy.id, schedules);
          return updatedSchedules;
        });
        this.isCreatingSchedule.set(false);
        this.closeScheduleSelection();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.getPremiumErrorMessage(error));
        this.isCreatingSchedule.set(false);
      }
    });
  }

  protected nextInstallment(policyId: string): PremiumSchedule | null {
    return [...(this.paymentSchedules().get(policyId) ?? [])]
      .filter((schedule) => schedule.status.toLowerCase() !== 'paid')
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))[0] ?? null;
  }

  protected schedulesForPolicy(policyId: string): PremiumSchedule[] {
    return [...(this.paymentSchedules().get(policyId) ?? [])]
      .sort((first, second) => first.installmentNumber - second.installmentNumber);
  }

  protected hasPaymentSchedule(policyId: string): boolean { return this.schedulesForPolicy(policyId).length > 0; }

  protected scheduleStatusLabel(status: string): string { return status.replace(/([a-z])([A-Z])/g, '$1 $2'); }

  protected renewalStatus(policy: PolicyResponse): string {
    const daysUntilExpiry = Math.ceil((new Date(`${policy.endDate}T00:00:00`).getTime() - Date.now()) / 86_400_000);
    if (daysUntilExpiry < 0) return 'This policy has reached its end date.';
    if (daysUntilExpiry <= 30) return `Renewal due in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.`;
    return `Coverage is active until ${new Date(`${policy.endDate}T00:00:00`).toLocaleDateString()}.`;
  }

  protected renewalNeedsAttention(policy: PolicyResponse): boolean {
    return new Date(`${policy.endDate}T00:00:00`).getTime() - Date.now() <= 30 * 86_400_000;
  }

  protected canSubmitClaim(policyId: string): boolean {
    const schedules = this.paymentSchedules().get(policyId) ?? [];
    return schedules.some((schedule) => schedule.status.toLowerCase() === 'paid')
      && !schedules.some((schedule) => schedule.status.toLowerCase() === 'overdue');
  }

  protected openClaims(policyId: string): void {
    if (!this.canSubmitClaim(policyId)) return;
    void this.router.navigate(['/customer/claims/new'], { queryParams: { policyId } });
  }

  protected submitForReview(policy: PolicyResponse): void {
    if (policy.status !== 1) return;
    this.error.set('');
    this.submittingApplicationId.set(policy.id);
    this.policyService.transitionStatus(policy.id, {
      status: 2,
      remarks: 'Customer submitted this application for underwriting review.'
    }).subscribe({
      next: (updatedPolicy) => {
        this.policies.update((policies) => policies.map((item) => item.id === updatedPolicy.id ? updatedPolicy : item));
        this.submittingApplicationId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(error));
        this.submittingApplicationId.set(null);
      }
    });
  }

  protected submit(): void {
    if (!this.customer || this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.customer.kyc?.status !== 2) {
      this.error.set('Your KYC must be verified before you can submit a policy application.');
      return;
    }
    const value = this.form.getRawValue();
    if (value.startDate < this.minimumStartDate) { this.error.set('The policy start date cannot be in the past.'); return; }
    if (value.startDate > value.endDate) { this.error.set('The policy end date must be after its start date.'); return; }
    if (value.deductible >= value.sumInsured) { this.error.set('The deductible must be lower than the sum insured.'); return; }
    const selectedType = this.selectedPolicyType();
    if (!selectedType) { this.error.set('Choose a policy type first.'); return; }
    this.error.set('');
    this.isSubmitting.set(true);
    const request = {
      customerId: this.customer.id,
      policyTypeId: selectedType.id,
      startDate: value.startDate,
      endDate: value.endDate,
      coverages: [{ name: value.coverageName, description: value.coverageDescription, sumInsured: value.sumInsured, deductible: value.deductible }],
      remarks: value.remarks.trim()
    };
    const editingPolicyId = this.editingPolicyId();
    const save = editingPolicyId
      ? this.policyService.update(editingPolicyId, { ...request, status: 1 } satisfies UpdatePolicyRequest)
      : this.policyService.create({ ...request, remarks: request.remarks || null } satisfies CreatePolicyRequest);
    save.subscribe({
      next: (policy) => {
        this.savedPolicy.set(policy);
        this.lastSaveWasUpdate.set(!!editingPolicyId);
        this.policies.update((policies) => editingPolicyId ? policies.map((item) => item.id === policy.id ? policy : item) : [policy, ...policies]);
        this.editingPolicyId.set(null);
        this.isSubmitting.set(false);
        if (!editingPolicyId) void this.router.navigate(['/customer/applications']);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  private getStoredCustomer(): CustomerResponse | null {
    try { return JSON.parse(localStorage.getItem('insurance.customer') || 'null') as CustomerResponse | null; } catch { return null; }
  }

  private toDateInput(value: Date): string { return value.toISOString().slice(0, 10); }

  private loadPolicyTypes(afterLoad?: () => void): void {
    this.isLoadingTypes.set(true);
    this.policyService.getTypes().subscribe({
      next: (types) => { this.policyTypes.set(types); this.isLoadingTypes.set(false); afterLoad?.(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isLoadingTypes.set(false); }
    });
  }

  private loadPaymentStatuses(policies: PolicyResponse[]): void {
    const activePolicies = policies.filter((policy) => policy.status === 3);
    if (activePolicies.length === 0) return;

    this.isLoadingPayments.set(true);
    forkJoin({
      plans: this.premiumService.getPlans(),
      schedulesByPolicy: forkJoin(activePolicies.map((policy) => this.premiumService.getSchedules(policy.id)))
    }).subscribe({
      next: ({ plans, schedulesByPolicy }) => {
        this.premiumPlans.set(plans);
        this.paymentSchedules.set(new Map(activePolicies.map((policy, index) => [policy.id, schedulesByPolicy[index]])));
        this.isLoadingPayments.set(false);
      },
      error: () => this.isLoadingPayments.set(false)
    });
  }

  private scrollToApplicationForm(): void {
    setTimeout(() => document.getElementById('policy-application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  private getCoverageDefaults(policyTypeCode: string): Pick<{ coverageName: string; coverageDescription: string; sumInsured: number; deductible: number }, 'coverageName' | 'coverageDescription' | 'sumInsured' | 'deductible'> {
    return ({
      AUTO_COMPREHENSIVE: { coverageName: 'Comprehensive motor cover', coverageDescription: 'Collision, theft, and third-party liability protection.', sumInsured: 800000, deductible: 5000 },
      HEALTH_STANDARD: { coverageName: 'Hospitalization cover', coverageDescription: 'In-patient treatment and hospitalization expenses.', sumInsured: 500000, deductible: 10000 },
      LIFE_PROTECT: { coverageName: 'Life protection benefit', coverageDescription: 'Life cover payable to the recorded nominee or beneficiary.', sumInsured: 1000000, deductible: 0 }
    } as Record<string, { coverageName: string; coverageDescription: string; sumInsured: number; deductible: number }>)[policyTypeCode]
      ?? { coverageName: 'Core protection', coverageDescription: 'Essential protection for your selected policy.', sumInsured: 500000, deductible: 0 };
  }

  protected policyStatusLabel(status: number): string {
    return ({ 1: 'Draft', 2: 'Pending approval', 3: 'Active', 4: 'Lapsed', 5: 'Cancelled', 6: 'Expired' } as Record<number, string>)[status] ?? 'Unknown';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach Policy Service. Start it on port 5182 and try again.';
    if (error.status === 429) return 'Policy Service is receiving too many requests. Wait a moment, then refresh and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'We could not create this policy. Please try again.';
  }

  private getPremiumErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 404) return 'The selected premium plan is no longer available.';
    if (error.status === 409) return 'A payment schedule already exists for this policy. Refresh the page to view it.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    return 'We could not create a premium schedule. Please try again.';
  }
}