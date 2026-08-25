import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerRequest, CustomerResponse, CustomerUpdateRequest } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../../identity/services/auth.service';

@Component({
  selector: 'app-customer-onboarding',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './customer-onboarding.component.html',
  styleUrl: './customer-onboarding.component.css'
})
export class CustomerOnboardingComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly session = this.authService.getSession();
  protected readonly currentCustomer = signal<CustomerResponse | null>(this.getStoredCustomer());
  protected readonly isSubmitting = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly apiError = signal('');
  protected readonly uploadError = signal('');
  protected readonly uploadSuccess = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly includeAddress = signal(true);
  protected readonly includeNominee = signal(false);
  protected readonly fullName = this.session?.userName ?? '';
  protected readonly isReady = computed(() => !this.isSubmitting());
  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: [this.fullName.split(' ')[0] ?? '', Validators.required], lastName: [this.fullName.split(' ').slice(1).join(' '), Validators.required],
    email: [this.session?.email ?? '', [Validators.required, Validators.email]], phoneNumber: ['', Validators.required], dateOfBirth: ['', Validators.required],
    documentType: ['', Validators.required], documentNumber: ['', Validators.required], line1: ['', Validators.required], line2: [''], city: ['', Validators.required], state: ['', Validators.required], postalCode: ['', Validators.required], country: ['India', Validators.required],
    nomineeName: [''], nomineeRelationship: [''], nomineePhone: [''], nomineeEmail: ['']
  });

  constructor() {
    this.loadCurrentCustomer();
  }

  protected setAddressIncluded(included: boolean): void { this.includeAddress.set(included); }
  protected setNomineeIncluded(included: boolean): void { this.includeNominee.set(included); }

  protected selectDocument(event: Event): void {
    this.uploadError.set('');
    this.uploadSuccess.set('');
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!acceptedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.selectedFile.set(null);
      this.uploadError.set('Choose a PDF, JPEG, or PNG file no larger than 10 MB.');
      return;
    }
    this.selectedFile.set(file);
  }

  protected uploadDocument(): void {
    const file = this.selectedFile();
    const customer = this.currentCustomer();
    const documentType = this.form.controls.documentType.value;
    this.uploadError.set('');
    this.uploadSuccess.set('');
    if (!customer || !file || !documentType) {
      this.uploadError.set('Select a document type and choose a file before uploading.');
      return;
    }
    this.isUploading.set(true);
    this.customerService.uploadKycDocument(customer.id, documentType, file).subscribe({
      next: (result) => {
        this.uploadSuccess.set(`Document submitted. Case ${result.kycCaseId} is pending review.`);
        this.selectedFile.set(null);
        this.isUploading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.uploadError.set(this.getErrorMessage(error));
        this.isUploading.set(false);
      }
    });
  }

  protected submit(): void {
    this.apiError.set('');
    if (this.form.invalid || (this.includeNominee() && !this.hasCompleteNominee())) {
      this.form.markAllAsTouched();
      if (this.includeNominee() && !this.hasCompleteNominee()) this.apiError.set('Complete the nominee name, relationship, and phone number.');
      return;
    }
    const value = this.form.getRawValue();
    const request: CustomerRequest = {
      firstName: value.firstName, lastName: value.lastName, email: value.email, phoneNumber: value.phoneNumber, dateOfBirth: value.dateOfBirth,
      address: this.includeAddress() ? { line1: value.line1, line2: value.line2 || null, city: value.city, state: value.state, postalCode: value.postalCode, country: value.country } : null,
      nominee: this.includeNominee() ? { fullName: value.nomineeName, relationship: value.nomineeRelationship, phoneNumber: value.nomineePhone, email: value.nomineeEmail || null } : null,
      kyc: { documentType: value.documentType, documentNumber: value.documentNumber, status: 1, verifiedAtUtc: null }
    };
    const existingCustomer = this.currentCustomer();
    this.isSubmitting.set(true);
    const saveRequest = existingCustomer
      ? this.customerService.update(existingCustomer.id, { ...request, isActive: existingCustomer.isActive, kyc: null } satisfies CustomerUpdateRequest)
      : this.customerService.create(request);
    saveRequest.subscribe({
      next: (customer) => {
        localStorage.setItem('insurance.customer', JSON.stringify(customer));
        this.currentCustomer.set(customer);
        this.apiError.set('Your profile is saved. Upload your KYC document for review.');
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => { this.apiError.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  private loadCurrentCustomer(): void {
    this.customerService.getCurrent().subscribe({
      next: (customer) => {
        localStorage.setItem('insurance.customer', JSON.stringify(customer));
        this.currentCustomer.set(customer);
        this.includeAddress.set(customer.address !== null);
        this.includeNominee.set(customer.nominee !== null);
        this.form.patchValue({
          firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phoneNumber: customer.phoneNumber,
          dateOfBirth: customer.dateOfBirth, documentType: customer.kyc?.documentType ?? '', documentNumber: '',
          line1: customer.address?.line1 ?? '', line2: customer.address?.line2 ?? '', city: customer.address?.city ?? '', state: customer.address?.state ?? '', postalCode: customer.address?.postalCode ?? '', country: customer.address?.country ?? 'India',
          nomineeName: customer.nominee?.fullName ?? '', nomineeRelationship: customer.nominee?.relationship ?? '', nomineePhone: customer.nominee?.phoneNumber ?? '', nomineeEmail: customer.nominee?.email ?? ''
        });
        if (customer.kyc) {
          this.form.controls.documentNumber.clearValidators();
          this.form.controls.documentNumber.updateValueAndValidity({ emitEvent: false });
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status !== 404) this.apiError.set(this.getErrorMessage(error));
      }
    });
  }

  private hasCompleteNominee(): boolean {
    const { nomineeName, nomineeRelationship, nomineePhone } = this.form.getRawValue();
    return !!nomineeName.trim() && !!nomineeRelationship.trim() && !!nomineePhone.trim();
  }

  private getStoredCustomer(): CustomerResponse | null {
    const storedCustomer = localStorage.getItem('insurance.customer');
    if (!storedCustomer) return null;
    try { return JSON.parse(storedCustomer) as CustomerResponse; } catch { return null; }
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach Customer Service. Start it on port 5180 and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'We could not save your customer profile. Please try again.';
  }
}