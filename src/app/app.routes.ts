import { Routes } from '@angular/router';
import { CustomerOnboardingComponent } from './features/customer/pages/customer-onboarding/customer-onboarding.component';
import { KycReviewComponent } from './features/customer/pages/kyc-review/kyc-review.component';
import { ClaimsListComponent } from './features/claim/pages/claims-list/claims-list.component';
import { ClaimDetailComponent } from './features/claim/pages/claim-detail/claim-detail.component';
import { ClaimFormComponent } from './features/claim/pages/claim-form/claim-form.component';
import { NotificationHistoryComponent } from './features/notification/pages/notification-history/notification-history.component';
import { PremiumWorkspaceComponent } from './features/premium/pages/premium-workspace/premium-workspace.component';
import { PremiumPlansComponent } from './features/premium/pages/premium-plans/premium-plans.component';
import { PolicyManagementComponent } from './features/policy/pages/policy-management/policy-management.component';
import { authGuard } from './features/identity/guards/auth.guard';
import { AdministrationComponent } from './features/identity/pages/administration/administration.component';
import { AuthPageComponent } from './features/identity/pages/auth-page/auth-page.component';
import { DashboardComponent } from './features/identity/pages/dashboard/dashboard.component';
import { PolicyWorkspaceComponent } from './features/policy/pages/policy-workspace/policy-workspace.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: AuthPageComponent, data: { mode: 'login' }, title: 'Sign in | SureCover' },
	{ path: 'register', component: AuthPageComponent, data: { mode: 'register' }, title: 'Create account | SureCover' },
	{
		path: '',
		component: AppShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'dashboard', component: DashboardComponent, title: 'Dashboard | SureCover' },
			{ path: 'administration', component: AdministrationComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Administration | SureCover' },
			{ path: 'policy-management', component: PolicyManagementComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Policy Management | SureCover' },
			{ path: 'premium-plans', component: PremiumPlansComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Premium Plans | SureCover' },
			{ path: 'profile', component: CustomerOnboardingComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Profile and KYC | SureCover' },
			{ path: 'kyc-review', component: KycReviewComponent, canActivate: [authGuard], data: { roles: ['KycReviewer'] }, title: 'KYC Review | SureCover' },
			{ path: 'policies', component: PolicyWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer', 'PolicyUnderwriter', 'SupportAgent'] }, title: 'Policies | SureCover' },
			{ path: 'premiums', component: PremiumWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Premiums | SureCover' },
			{ path: 'notifications', component: NotificationHistoryComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Notifications | SureCover' },
			{ path: 'claims', component: ClaimsListComponent, canActivate: [authGuard], data: { roles: ['Customer', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer'] }, title: 'Claims | SureCover' },
			{ path: 'claims/new', component: ClaimFormComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'New claim | SureCover' },
			{ path: 'claims/:claimId', component: ClaimDetailComponent, canActivate: [authGuard], data: { roles: ['Customer', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer'] }, title: 'Claim detail | SureCover' },
		],
	},
	{
		path: 'ai-assistant',
		canActivate: [authGuard],
		data: { roles: ['Customer', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin'] },
		loadChildren: () => import('./features/ai-assistant/routes/ai-assistant.routes').then((module) => module.AI_ASSISTANT_ROUTES),
	},
	{
		path: 'reporting',
		canActivate: [authGuard],
		data: { roles: ['ComplianceOfficer', 'PlatformAdmin', 'ClaimsAdjuster', 'PaymentOperations'] },
		loadChildren: () => import('./features/reporting/app.routes').then((module) => module.routes),
	},
	{ path: '**', redirectTo: 'login' },
];
