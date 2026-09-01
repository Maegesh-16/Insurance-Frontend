import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { PremiumPlan } from '../../models/premium.models';
import { CreatePremiumPlanRequest, PremiumService } from '../../services/premium.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { PolicyType } from '../../../policy/models/policy.models';

@Component({
  selector: 'app-premium-plans',
  imports: [CurrencyPipe, TitleCasePipe, FormsModule],
  templateUrl: './premium-plans.component.html'
})
export class PremiumPlansComponent {
  private readonly premiumService = inject(PremiumService);
  private readonly policyService = inject(PolicyService);
  protected readonly plans = signal<PremiumPlan[]>([]);
  protected readonly policyTypes = signal<PolicyType[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly showForm = signal(false);
  protected readonly FREQUENCIES = ['Monthly', 'Quarterly', 'HalfYearly', 'Annually'];
  protected newPlan: CreatePremiumPlanRequest = this.blankPlan();

  constructor() {
    this.premiumService.getPlans().subscribe({
      next: (plans) => { this.plans.set(plans); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.msg(error)); this.isLoading.set(false); }
    });
    this.policyService.getTypes().subscribe({
      next: (types) => this.policyTypes.set(types),
      error: () => {}
    });
  }

  protected openForm(): void { this.newPlan = this.blankPlan(); this.saveError.set(''); this.saveSuccess.set(''); this.showForm.set(true); }

  protected policyTypeName(id: string): string {
    return this.policyTypes().find((t) => t.id === id)?.name ?? id;
  }

  protected submit(): void {
    if (!this.newPlan.policyTypeId || !this.newPlan.frequency || this.newPlan.basePremium <= 0) {
      this.saveError.set('Policy type, frequency, and a positive base premium are required.');
      return;
    }
    this.isSaving.set(true);
    this.saveError.set('');
    this.premiumService.createPlan(this.newPlan).pipe(timeout(90000)).subscribe({
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

  private blankPlan(): CreatePremiumPlanRequest { return { policyTypeId: '', frequency: '', basePremium: 0 }; }
  private msg(error: unknown): string {
    if (error instanceof Error && error.name === 'TimeoutError') return 'Premium Service did not respond. Please try again after the service is available.';
    if (error instanceof HttpErrorResponse && typeof error.error?.detail === 'string') return error.error.detail;
    return 'Premium Service is unavailable.';
  }
}
