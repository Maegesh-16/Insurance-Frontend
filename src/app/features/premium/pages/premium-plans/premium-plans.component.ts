import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concatMap, from, timeout, toArray } from 'rxjs';
import { CreatePremiumPlanRequest, installmentPremium, PREMIUM_FREQUENCIES, PremiumFrequency, PremiumPlan } from '../../models/premium.models';
import { PremiumService } from '../../services/premium.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { CreatePolicyTypeRequest, PolicyType } from '../../../policy/models/policy.models';

type PremiumPlanDraft = Omit<CreatePremiumPlanRequest, 'frequency'> & { frequency: PremiumFrequency | '' };

@Component({
  selector: 'app-premium-plans',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './premium-plans.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PremiumPlansComponent {
  private readonly premiumService = inject(PremiumService);
  private readonly policyService = inject(PolicyService);
  protected readonly plans = signal<PremiumPlan[]>([]);
  protected readonly policyTypes = signal<PolicyType[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingPolicyTypes = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isCreatingMissing = signal(false);
  protected readonly error = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly showForm = signal(false);
  protected readonly showPolicyTypeForm = signal(false);
  protected readonly policyTypeSaveError = signal('');
  protected readonly policyTypeSaveSuccess = signal('');
  protected readonly isSavingPolicyType = signal(false);
  protected readonly savingPolicyTypeId = signal<string | null>(null);
  protected readonly frequencies = PREMIUM_FREQUENCIES;
  protected readonly availablePolicyTypes = computed(() => this.policyTypes().filter((policyType) => policyType.isAvailable !== false));
  protected readonly missingPlans = computed(() => this.availablePolicyTypes().flatMap((policyType) =>
    PREMIUM_FREQUENCIES
      .filter((frequency) => !this.hasPlan(policyType.id, frequency.value))
      .map((frequency): CreatePremiumPlanRequest => ({
        policyTypeId: policyType.id,
        frequency: frequency.value,
        basePremium: installmentPremium(policyType.basePremium, frequency.value)
      }))
  ));
  protected readonly completeProductCount = computed(() => this.availablePolicyTypes().filter((policyType) =>
    PREMIUM_FREQUENCIES.every((frequency) => this.hasPlan(policyType.id, frequency.value))
  ).length);
  protected newPlan: PremiumPlanDraft = this.blankPlan();
  protected newPolicyType: CreatePolicyTypeRequest = this.blankPolicyType();

  constructor() {
    this.premiumService.getPlans().subscribe({
      next: (plans) => { this.plans.set(plans); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.msg(error)); this.isLoading.set(false); }
    });
    this.policyService.getTypes().subscribe({
      next: (types) => { this.policyTypes.set(types); this.isLoadingPolicyTypes.set(false); },
      error: () => this.isLoadingPolicyTypes.set(false)
    });
  }

  protected openForm(): void { this.newPlan = this.blankPlan(); this.saveError.set(''); this.saveSuccess.set(''); this.showForm.set(true); }
  protected openPolicyTypeForm(): void { this.newPolicyType = this.blankPolicyType(); this.policyTypeSaveError.set(''); this.policyTypeSaveSuccess.set(''); this.showPolicyTypeForm.set(true); }

  protected setPolicyTypeAvailability(policyType: PolicyType): void {
    const isAvailable = policyType.isAvailable === false;
    const action = isAvailable ? 'Restore' : 'Archive';
    if (!confirm(`${action} ${policyType.name}?`)) return;

    this.savingPolicyTypeId.set(policyType.id);
    this.error.set('');
    this.policyService.setTypeAvailability(policyType.id, isAvailable).subscribe({
      next: (updatedType) => {
        this.policyTypes.update((types) => types.map((type) => type.id === updatedType.id ? updatedType : type));
        this.policyTypeSaveSuccess.set(`Policy product ${isAvailable ? 'restored' : 'archived'}: ${updatedType.name}`);
        this.savingPolicyTypeId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.detail ?? `Policy product could not be ${isAvailable ? 'restored' : 'archived'}.`);
        this.savingPolicyTypeId.set(null);
      }
    });
  }

  protected submitPolicyType(): void {
    this.newPolicyType.code = this.newPolicyType.code.trim().toUpperCase();
    this.newPolicyType.name = this.newPolicyType.name.trim();
    this.newPolicyType.description = this.newPolicyType.description.trim();
    if (!this.newPolicyType.code || !this.newPolicyType.name || !this.newPolicyType.description || this.newPolicyType.basePremium <= 0) {
      this.policyTypeSaveError.set('Code, name, description, and a positive base premium are required.');
      return;
    }
    this.isSavingPolicyType.set(true);
    this.policyTypeSaveError.set('');
    this.policyService.createType(this.newPolicyType).subscribe({
      next: (policyType) => { this.policyTypes.update((types) => [...types, policyType]); this.policyTypeSaveSuccess.set(`Policy product created: ${policyType.name}`); this.isSavingPolicyType.set(false); this.showPolicyTypeForm.set(false); },
      error: (error: HttpErrorResponse) => { this.policyTypeSaveError.set(error.error?.detail ?? 'Policy product could not be created.'); this.isSavingPolicyType.set(false); }
    });
  }

  protected selectPolicyType(policyTypeId: string): void {
    this.newPlan.policyTypeId = policyTypeId;
    this.setSuggestedAmount();
  }

  protected selectFrequency(frequency: PremiumFrequency | ''): void {
    this.newPlan.frequency = frequency;
    this.setSuggestedAmount();
  }

  protected policyTypeName(id: string): string {
    return this.policyTypes().find((t) => t.id === id)?.name ?? id;
  }

  protected plansForType(policyTypeId: string): PremiumPlan[] {
    return this.plans().filter((plan) => plan.policyTypeId === policyTypeId);
  }

  protected submit(): void {
    if (!this.newPlan.policyTypeId || !this.newPlan.frequency || this.newPlan.basePremium <= 0) {
      this.saveError.set('Policy type, frequency, and a positive base premium are required.');
      return;
    }
    const request: CreatePremiumPlanRequest = { ...this.newPlan, frequency: this.newPlan.frequency };
    this.isSaving.set(true);
    this.saveError.set('');
    this.premiumService.createPlan(request).pipe(timeout(90000)).subscribe({
      next: (plan) => {
        this.plans.update((list) => [...list, plan]);
        this.saveSuccess.set(`Plan created: ${this.policyTypeName(plan.policyTypeId)} — ${plan.frequency}`);
        this.newPlan = this.blankPlan();
        this.isSaving.set(false);
        this.showForm.set(false);
      },
      error: (error: HttpErrorResponse) => { this.saveError.set(this.msg(error)); this.isSaving.set(false); }
    });
  }

  protected createMissingPlans(): void {
    const requests = this.missingPlans();
    if (!requests.length) {
      this.saveSuccess.set('All products already have the four standard payment frequencies. Use Add plan to create another rate version.');
      return;
    }

    this.isCreatingMissing.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');
    from(requests).pipe(
      concatMap((request) => this.premiumService.createPlan(request).pipe(timeout(90000))),
      toArray()
    ).subscribe({
      next: (createdPlans) => {
        this.plans.update((plans) => [...plans, ...createdPlans]);
        this.saveSuccess.set(`${createdPlans.length} missing premium plan${createdPlans.length === 1 ? '' : 's'} created.`);
        this.isCreatingMissing.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.saveError.set(this.msg(error));
        this.isCreatingMissing.set(false);
        this.reloadPlans();
      }
    });
  }

  protected frequencyLabel(frequency: string): string {
    return PREMIUM_FREQUENCIES.find((item) => item.value === frequency)?.label ?? frequency;
  }

  private hasPlan(policyTypeId: string, frequency: PremiumFrequency): boolean {
    return this.plans().some((plan) => plan.policyTypeId === policyTypeId && plan.frequency.toUpperCase() === frequency.toUpperCase());
  }

  private setSuggestedAmount(): void {
    const policyType = this.policyTypes().find((item) => item.id === this.newPlan.policyTypeId);
    if (policyType && this.newPlan.frequency) this.newPlan.basePremium = installmentPremium(policyType.basePremium, this.newPlan.frequency);
  }

  private reloadPlans(): void {
    this.premiumService.getPlans().subscribe({ next: (plans) => this.plans.set(plans), error: () => {} });
  }

  private blankPlan(): PremiumPlanDraft { return { policyTypeId: '', frequency: '', basePremium: 0 }; }
  private blankPolicyType(): CreatePolicyTypeRequest { return { code: '', name: '', description: '', basePremium: 0 }; }
  private msg(error: unknown): string {
    if (error instanceof Error && error.name === 'TimeoutError') return 'Premium Service did not respond. Please try again after the service is available.';
    if (error instanceof HttpErrorResponse && typeof error.error?.detail === 'string') return error.error.detail;
    return 'Premium Service is unavailable.';
  }
}
