import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreatePolicyTypeRequest, PolicyType } from '../../models/policy.models';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-product-management',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './policy-product-management.component.html'
})
export class PolicyProductManagementComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly policyService = inject(PolicyService);
  protected readonly products = signal<PolicyType[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/)]],
    name: ['', Validators.required],
    description: ['', Validators.required],
    basePremium: [0, [Validators.required, Validators.min(1)]]
  });

  constructor() { this.loadProducts(); }

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

  private loadProducts(): void {
    this.policyService.getTypes().subscribe({
      next: (products) => { this.products.set(products); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.isLoading.set(false); }
    });
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