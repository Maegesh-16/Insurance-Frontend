import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreatePremiumPlanRequest, installmentPremium, PREMIUM_FREQUENCIES, PremiumFrequency, PremiumPlan } from '../../../premium/models/premium.models';
import { PremiumService } from '../../../premium/services/premium.service';
import { CreatePolicyTypeRequest, PolicyType } from '../../models/policy.models';
import { PolicyService } from '../../services/policy.service';

type PremiumPlanDraft = Omit<CreatePremiumPlanRequest, 'policyTypeId' | 'frequency'> & { frequency: PremiumFrequency | '' };

@Component({
  selector: 'app-policy-product-management',
  imports: [CurrencyPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './policy-product-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyProductManagementComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly policyService = inject(PolicyService);
  private readonly premiumService = inject(PremiumService);
  protected readonly products = signal<PolicyType[]>([]);
  protected readonly plans = signal<PremiumPlan[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingPlans = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isSavingPlan = signal(false);
  protected readonly savingAvailabilityId = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly selectedProduct = signal<PolicyType | null>(null);
  protected readonly showPlanForm = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly planError = signal('');
  protected readonly planSuccess = signal('');
  protected readonly frequencies = PREMIUM_FREQUENCIES;
  protected newPlan: PremiumPlanDraft = this.blankPlan();
  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/)]],
    name: ['', Validators.required],
    description: ['', Validators.required],
    basePremium: [0, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.loadProducts();
    this.loadPlans();
  }

  protected openCreateForm(): void {
    this.form.reset({ code: '', name: '', description: '', basePremium: 0 });
    this.error.set('');
    this.success.set('');
    this.showForm.set(true);
  }

  protected saveProduct(): void {
    const value = this.form.getRawValue();
    const code = value.code.trim().toUpperCase();
    this.form.controls.code.setValue(code, { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete every required field. The product code must begin with a letter and use only letters, numbers, or underscores.');
      return;
    }
    const request: CreatePolicyTypeRequest = {
      code,
      name: value.name.trim(),
      description: value.description.trim(),
      basePremium: value.basePremium
    };
    this.isSaving.set(true);
    this.error.set('');
    this.policyService.createType(request).subscribe({
      next: (product) => {
        this.products.update((products) => [...products, product]);
        this.success.set(`${product.name} is now available to customers.`);
        this.isSaving.set(false);
        this.showForm.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.isSaving.set(false); }
    });
  }

  protected openPlans(product: PolicyType): void {
    this.selectedProduct.set(product);
    this.showPlanForm.set(false);
    this.planError.set('');
    this.planSuccess.set('');
  }

  protected setProductAvailability(product: PolicyType): void {
    const isAvailable = product.isAvailable === false;
    const action = isAvailable ? 'Restore' : 'Archive';
    if (!confirm(`${action} ${product.name}?`)) return;

    this.savingAvailabilityId.set(product.id);
    this.error.set('');
    this.success.set('');
    this.policyService.setTypeAvailability(product.id, isAvailable).subscribe({
      next: (updatedProduct) => {
        this.products.update((products) => products.map((item) => item.id === updatedProduct.id ? updatedProduct : item));
        this.success.set(`Policy product ${isAvailable ? 'restored' : 'archived'}: ${updatedProduct.name}`);
        this.savingAvailabilityId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.message(error));
        this.savingAvailabilityId.set(null);
      }
    });
  }

  protected closePlans(): void {
    if (this.isSavingPlan()) return;
    this.selectedProduct.set(null);
    this.showPlanForm.set(false);
  }

  protected plansForProduct(productId: string): PremiumPlan[] {
    return this.plans().filter((plan) => plan.policyTypeId === productId);
  }

  protected availableFrequencies(productId: string): typeof PREMIUM_FREQUENCIES[number][] {
    const configured = new Set(this.plansForProduct(productId).map((plan) => plan.frequency.toUpperCase()));
    return PREMIUM_FREQUENCIES.filter((frequency) => !configured.has(frequency.value.toUpperCase()));
  }

  protected frequencyLabel(frequency: string): string {
    return PREMIUM_FREQUENCIES.find((item) => item.value.toUpperCase() === frequency.toUpperCase())?.label ?? frequency;
  }

  protected openPlanForm(): void {
    const product = this.selectedProduct();
    if (!product) return;
    const frequency = this.availableFrequencies(product.id)[0]?.value ?? '';
    this.newPlan = { frequency, basePremium: frequency ? installmentPremium(product.basePremium, frequency) : 0 };
    this.planError.set('');
    this.planSuccess.set('');
    this.showPlanForm.set(true);
  }

  protected selectFrequency(frequency: PremiumFrequency | ''): void {
    this.newPlan.frequency = frequency;
    const product = this.selectedProduct();
    if (product && frequency) this.newPlan.basePremium = installmentPremium(product.basePremium, frequency);
  }

  protected savePlan(): void {
    const product = this.selectedProduct();
    if (!product || !this.newPlan.frequency || this.newPlan.basePremium <= 0) {
      this.planError.set('Frequency and a positive installment premium are required.');
      return;
    }
    if (!this.availableFrequencies(product.id).some((frequency) => frequency.value === this.newPlan.frequency)) {
      this.planError.set('This product already has a plan for the selected frequency.');
      return;
    }

    const request: CreatePremiumPlanRequest = {
      policyTypeId: product.id,
      frequency: this.newPlan.frequency,
      basePremium: this.newPlan.basePremium
    };
    this.isSavingPlan.set(true);
    this.planError.set('');
    this.premiumService.createPlan(request).subscribe({
      next: (plan) => {
        this.plans.update((plans) => [...plans, plan]);
        this.planSuccess.set(`${this.frequencyLabel(plan.frequency)} plan created for ${product.name}.`);
        this.isSavingPlan.set(false);
        this.showPlanForm.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.planError.set(this.premiumMessage(error));
        this.isSavingPlan.set(false);
      }
    });
  }

  private loadProducts(): void {
    this.policyService.getTypes().subscribe({
      next: (products) => { this.products.set(products); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.isLoading.set(false); }
    });
  }

  private loadPlans(): void {
    this.premiumService.getPlans().subscribe({
      next: (plans) => { this.plans.set(plans); this.isLoadingPlans.set(false); },
      error: (error: HttpErrorResponse) => { this.planError.set(this.premiumMessage(error)); this.isLoadingPlans.set(false); }
    });
  }

  private blankPlan(): PremiumPlanDraft { return { frequency: '', basePremium: 0 }; }

  private premiumMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (error.status === 401) return 'Your session has expired. Sign in again, then retry.';
    if (error.status === 403) return 'Your account does not have premium plan management permission.';
    return 'Premium plans are unavailable. Confirm the Premium Service is deployed and reachable.';
  }

  private message(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    if (error.status === 401) return 'Your session has expired. Sign in again, then retry creating the policy product.';
    if (error.status === 403) return 'Your account does not have policy product management permission.';
    if (error.status === 400) return 'The product could not be saved. Confirm the code is unique and all values are valid.';
    return 'Policy products are unavailable. Confirm the Policy Service is deployed and reachable.';
  }
}