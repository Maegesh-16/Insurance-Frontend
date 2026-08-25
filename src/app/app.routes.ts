import { Routes } from '@angular/router';
import { CustomerOnboardingComponent } from './features/customer/pages/customer-onboarding/customer-onboarding.component';
import { KycReviewComponent } from './features/customer/pages/kyc-review/kyc-review.component';
import { authGuard } from './features/identity/guards/auth.guard';
import { AuthPageComponent } from './features/identity/pages/auth-page/auth-page.component';
import { DashboardComponent } from './features/identity/pages/dashboard/dashboard.component';
import { PolicyWorkspaceComponent } from './features/policy/pages/policy-workspace/policy-workspace.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: AuthPageComponent, data: { mode: 'login' }, title: 'Sign in | SureCover' },
	{ path: 'register', component: AuthPageComponent, data: { mode: 'register' }, title: 'Create account | SureCover' },
	{
		path: '', component: AppShellComponent, canActivate: [authGuard], children: [
			{ path: 'dashboard', component: DashboardComponent, title: 'Dashboard | SureCover' },
			{ path: 'profile', component: CustomerOnboardingComponent, title: 'Profile and KYC | SureCover' },
			{ path: 'kyc-review', component: KycReviewComponent, title: 'KYC Review | SureCover' },
			{ path: 'policies', component: PolicyWorkspaceComponent, title: 'Policies | SureCover' }
		]
	},
	{ path: '**', redirectTo: 'login' }
];
