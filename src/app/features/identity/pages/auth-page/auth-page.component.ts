import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly mode = signal<AuthMode>('login');
  protected readonly isSubmitting = signal(false);
  protected readonly apiError = signal('');
  protected readonly successMessage = signal('');
  protected readonly isRegistering = computed(() => this.mode() === 'register');
  protected readonly isForgotPassword = computed(() => this.mode() === 'forgot-password');
  protected readonly isResettingPassword = computed(() => this.mode() === 'reset-password');
  protected readonly form = this.formBuilder.nonNullable.group({
    userName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['']
  });

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ mode }) => {
      this.mode.set(mode as AuthMode);
      const userNameControl = this.form.controls.userName;
      userNameControl.setValidators(this.mode() === 'register'
        ? [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
        : []);
      userNameControl.updateValueAndValidity();
      const emailControl = this.form.controls.email;
      emailControl.setValidators(this.isResettingPassword() ? [] : [Validators.required, Validators.email]);
      emailControl.updateValueAndValidity();
      const passwordControl = this.form.controls.password;
      passwordControl.setValidators(this.isForgotPassword() ? [] : [Validators.required, Validators.minLength(8)]);
      passwordControl.updateValueAndValidity();
      const confirmPasswordControl = this.form.controls.confirmPassword;
      confirmPasswordControl.setValidators(this.isResettingPassword() ? [Validators.required] : []);
      confirmPasswordControl.updateValueAndValidity();
      this.apiError.set('');
      this.successMessage.set('');
      this.form.reset();
    });
  }

  protected submit(): void {
    this.apiError.set('');
    this.successMessage.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const { email, password, userName, confirmPassword } = this.form.getRawValue();
    if (this.isResettingPassword() && password !== confirmPassword) {
      this.apiError.set('Passwords do not match.');
      return;
    }
    if (this.isForgotPassword()) {
      this.submitForgotPassword(email);
      return;
    }
    if (this.isResettingPassword()) {
      const token = this.route.snapshot.queryParamMap.get('token');
      if (!token) { this.apiError.set('This password link is invalid or incomplete.'); return; }
      this.submitPasswordReset(token, password);
      return;
    }
    const request = this.isRegistering() ? this.authService.register({ email, password, userName }) : this.authService.login({ email, password });
    request.subscribe({
      next: (response) => {
        this.authService.saveSession(response);
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error: HttpErrorResponse) => { this.apiError.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  protected fieldError(fieldName: 'userName' | 'email' | 'password' | 'confirmPassword'): string {
    const control = this.form.controls[fieldName];
    if (!control.touched || !control.errors) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('minlength')) return fieldName === 'password' ? 'Use at least 8 characters.' : 'Use at least 3 characters.';
    return 'Check this value and try again.';
  }

  private submitForgotPassword(email: string): void {
    this.isSubmitting.set(true);
    this.authService.requestPasswordReset(email).subscribe({
      next: () => { this.successMessage.set('If an active account uses this email address, a password reset link has been sent.'); this.isSubmitting.set(false); },
      error: (error: HttpErrorResponse) => { this.apiError.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  private submitPasswordReset(token: string, password: string): void {
    this.isSubmitting.set(true);
    this.authService.resetPassword(token, password).subscribe({
      next: () => { this.successMessage.set('Your password has been set. You can now sign in.'); this.isSubmitting.set(false); this.form.reset(); },
      error: (error: HttpErrorResponse) => { this.apiError.set(this.getErrorMessage(error)); this.isSubmitting.set(false); }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach Identity Service. Start the backend and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    if (error.status === 401) return 'Your email or password is incorrect.';
    return 'We could not complete your request. Please try again.';
  }
}