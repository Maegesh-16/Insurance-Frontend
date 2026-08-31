import { Routes } from '@angular/router';
import { CustomerOnboardingComponent } from './features/customer/pages/customer-onboarding/customer-onboarding.component';
import { KycReviewComponent } from './features/customer/pages/kyc-review/kyc-review.component';
import { authGuard } from './features/identity/guards/auth.guard';
import { AuthPageComponent } from './features/identity/pages/auth-page/auth-page.component';
import { AdministrationComponent } from './features/identity/pages/administration/administration.component';
import { DashboardComponent } from './features/identity/pages/dashboard/dashboard.component';
import { NotificationHistoryComponent } from './features/notification/pages/notification-history/notification-history.component';
import { PolicyWorkspaceComponent } from './features/policy/pages/policy-workspace/policy-workspace.component';
import { PremiumWorkspaceComponent } from './features/premium/pages/premium-workspace/premium-workspace.component';
import { PolicyManagementComponent } from './features/policy/pages/policy-management/policy-management.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: AuthPageComponent, data: { mode: 'login' }, title: 'Sign in | SureCover' },
	{ path: 'register', component: AuthPageComponent, data: { mode: 'register' }, title: 'Create account | SureCover' },
	{
		path: '', component: AppShellComponent, canActivate: [authGuard], children: [
			{ path: 'dashboard', component: DashboardComponent, title: 'Dashboard | SureCover' },
			{ path: 'administration', component: AdministrationComponent, title: 'Administration | SureCover' },
			{ path: 'profile', component: CustomerOnboardingComponent, title: 'Profile and KYC | SureCover' },
			{ path: 'kyc-review', component: KycReviewComponent, title: 'KYC Review | SureCover' },
						{ path: 'policy-management', component: PolicyManagementComponent, title: 'Policy Management | SureCover' },
			{ path: 'policies', component: PolicyWorkspaceComponent, title: 'Policies | SureCover' },
			{ path: 'premiums', component: PremiumWorkspaceComponent, title: 'Premiums | SureCover' },
			{ path: 'notifications', component: NotificationHistoryComponent, title: 'Notifications | SureCover' }
		]
	},
	{ path: '**', redirectTo: 'login' }
];
