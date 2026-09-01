import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { PolicyResponse } from '../../../policy/models/policy.models';
import { PolicyService } from '../../../policy/services/policy.service';
import { PremiumCalculation, PremiumDiscount, PremiumHistory, PremiumPlan, PremiumSchedule } from '../../models/premium.models';
import { PremiumService } from '../../services/premium.service';

@Component({
  selector: 'app-premium-workspace',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe],
  templateUrl: './premium-workspace.component.html'
})
export class PremiumWorkspaceComponent {
  private readonly policyService = inject(PolicyService);
  private readonly premiumService = inject(PremiumService);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly plans = signal<PremiumPlan[]>([]);
  protected readonly schedules = signal<PremiumSchedule[]>([]);
  protected readonly history = signal<PremiumHistory[]>([]);
  protected readonly discounts = signal<PremiumDiscount[]>([]);
  protected readonly calculation = signal<PremiumCalculation | null>(null);
  protected readonly selectedPolicyId = signal('');
  protected readonly selectedFrequency = signal('');
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly customer = this.getStoredCustomer();

  constructor() {
    if (!this.customer) {
      this.error.set('Complete your profile before viewing premium details.');
      this.isLoading.set(false);
      return;
    }
    this.loadPolicies();
    this.premiumService.getPlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  protected selectPolicy(policyId: string): void {
    if (this.selectedPolicyId() === policyId) return;
    this.selectedPolicyId.set(policyId);
    this.selectedFrequency.set('');
    this.calculation.set(null);
    this.loadPolicyDetails();
  }

  protected selectFrequency(frequency: string): void {
    const policy = this.selectedPolicy();
    if (!policy || this.selectedFrequency() === frequency) return;
    this.selectedFrequency.set(frequency);
    this.calculation.set(null);
    this.premiumService.calculate(policy.id, policy.policyTypeId, frequency).subscribe({
      next: (calculation) => this.calculation.set(calculation),
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  protected selectedPolicy(): PolicyResponse | null {
    return this.policies().find((policy) => policy.id === this.selectedPolicyId()) ?? null;
  }

  protected availablePlans(): PremiumPlan[] {
    const policy = this.selectedPolicy();
    return policy ? this.plans().filter((plan) => plan.policyTypeId === policy.policyTypeId) : [];
  }

  protected statusClass(status: string): string {
    const value = status.toLowerCase();
    if (value === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (value === 'overdue') return 'border-red-200 bg-red-50 text-red-800';
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  private loadPolicies(): void {
    this.policyService.getMine(this.customer!.id).subscribe({
      next: (policies) => {
        this.policies.set(policies);
        this.isLoading.set(false);
        if (policies[0]) {
          this.selectedPolicyId.set(policies[0].id);
          this.loadPolicyDetails();
        }
      },
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  private loadPolicyDetails(): void {
    const policyId = this.selectedPolicyId();
    if (!policyId) return;
    this.error.set('');
    this.premiumService.getSchedules(policyId).subscribe({ next: (schedules) => this.schedules.set(schedules), error: (error: HttpErrorResponse) => this.handleError(error) });
    this.premiumService.getHistory(policyId).subscribe({ next: (history) => this.history.set(history), error: (error: HttpErrorResponse) => this.handleError(error) });
    this.premiumService.getDiscounts(policyId).subscribe({ next: (discounts) => this.discounts.set(discounts), error: (error: HttpErrorResponse) => this.handleError(error) });
  }

  private getStoredCustomer(): { id: string } | null {
    try { return JSON.parse(localStorage.getItem('insurance.customer') || 'null') as { id: string } | null; } catch { return null; }
  }

  private handleError(error: HttpErrorResponse): void {
    this.isLoading.set(false);
    if (error.status === 0) this.error.set('Cannot reach Premium Service. Start it on port 5169 and try again.');
    else if (error.status === 401 || error.status === 403) this.error.set('Your account is not authorized to view premium details.');
    else if (typeof error.error?.detail === 'string') this.error.set(error.error.detail);
    else this.error.set('We could not load premium details. Please try again.');
  }
}