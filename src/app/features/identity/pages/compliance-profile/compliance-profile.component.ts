import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-compliance-profile',
  imports: [RouterLink],
  template: `
    <section>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Compliance Officer</p>
      <h1 class="font-serif text-4xl leading-tight sm:text-5xl">Profile</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-emerald-900/65">Your authenticated account details and compliance access scope.</p>

      <section class="mt-8 max-w-3xl border border-emerald-950/10 bg-white p-5 shadow-sm">
        <dl class="divide-y divide-emerald-950/10">
          <div class="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4"><dt class="text-sm font-semibold text-emerald-900/65">Name</dt><dd class="text-sm font-semibold sm:col-span-2">{{ session?.userName || 'Not available' }}</dd></div>
          <div class="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4"><dt class="text-sm font-semibold text-emerald-900/65">Email</dt><dd class="text-sm sm:col-span-2">{{ session?.email || 'Not available' }}</dd></div>
          <div class="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4"><dt class="text-sm font-semibold text-emerald-900/65">Role</dt><dd class="text-sm sm:col-span-2">Compliance Officer</dd></div>
        </dl>
      </section>

      <section class="mt-6 max-w-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Password management</p>
        <p class="mt-2 text-sm leading-6 text-amber-950/75">A signed-in password-change endpoint is not available. Use the supported password reset flow to set a new password.</p>
        <a routerLink="/forgot-password" class="mt-4 inline-block border border-amber-900 px-4 py-2 text-sm font-bold text-amber-950">Reset password</a>
      </section>
    </section>
  `
})
export class ComplianceProfileComponent {
  private readonly authService = inject(AuthService);
  protected readonly session = this.authService.getSession();
}