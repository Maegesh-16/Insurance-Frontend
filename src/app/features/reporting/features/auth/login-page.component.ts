import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-layout">
      <section class="auth-hero">
        <div>
          <p class="brand-kicker">Reporting Service Frontend</p>
          <h1>Start with the service, not a template.</h1>
          <p>
            This Angular workspace mirrors the backend reporting domains: catalog, requests, execution history,
            snapshots, schedules, metrics, and reference data.
          </p>

          <div class="hero-stats">
            <article class="hero-stat">
              <strong>7</strong>
              <span>Primary reporting domains</span>
            </article>
            <article class="hero-stat">
              <strong>JWT</strong>
              <span>Protected API session model</span>
            </article>
            <article class="hero-stat">
              <strong>Live</strong>
              <span>Proxy-ready local integration</span>
            </article>
          </div>
        </div>

        <div>
          <p class="eyebrow">Development Accounts</p>
          <div class="credentials-grid">
            @for (credential of credentials; track credential.email) {
              <article class="credential-card">
                <strong>{{ credential.label }}</strong>
                <p class="brand-copy">{{ credential.email }}</p>
                <p class="brand-copy">{{ credential.roles }}</p>
                <button class="secondary-button" type="button" (click)="useCredential(credential.email, credential.password)">
                  Use credentials
                </button>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="login-card">
        <div class="auth-header">
          <div>
            <p class="page-kicker">Secure Access</p>
            <h2>Sign in to the reporting workspace</h2>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="alert" style="margin-top: 18px;">{{ errorMessage() }}</div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="submit()" class="page-stack" style="margin-top: 24px;">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="admin@reporting.local" />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" placeholder="Enter your password" />
          </div>

          <p class="form-hint">Use the backend development users or replace them later with your actual auth source.</p>

          <div class="actions-row">
            <button class="primary-button" type="submit" [disabled]="loginForm.invalid || isSubmitting()">
              {{ isSubmitting() ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class LoginPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['admin@reporting.local', [Validators.required, Validators.email]],
    password: ['Admin@123', Validators.required]
  });

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly credentials = [
    {
      label: 'Administrator',
      email: 'admin@reporting.local',
      password: 'Admin@123',
      roles: 'Admin, ReportingAdmin'
    },
    {
      label: 'Manager',
      email: 'manager@reporting.local',
      password: 'Manager@123',
      roles: 'Manager, ReportingViewer'
    }
  ];

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
    }
  }

  protected useCredential(email: string, password: string): void {
    this.loginForm.setValue({ email, password });
  }

  protected submit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message ?? 'Unable to sign in with the provided credentials.');
        }
      });
  }
}