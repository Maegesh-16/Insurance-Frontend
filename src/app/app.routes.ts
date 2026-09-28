import { Routes } from '@angular/router';
import { CustomerOnboardingComponent } from './features/customer/pages/customer-onboarding/customer-onboarding.component';
import { CustomerSearchComponent } from './features/customer/pages/customer-search/customer-search.component';
import { KycReviewComponent } from './features/customer/pages/kyc-review/kyc-review.component';
import { KycHistoryComponent } from './features/customer/pages/kyc-history/kyc-history.component';
import { KycReportsComponent } from './features/customer/pages/kyc-reports/kyc-reports.component';
import { ClaimDetailComponent } from './features/claim/pages/claim-detail/claim-detail.component';
import { ClaimFormComponent } from './features/claim/pages/claim-form/claim-form.component';
import { NotificationHistoryComponent } from './features/notification/pages/notification-history/notification-history.component';
import { PremiumWorkspaceComponent } from './features/premium/pages/premium-workspace/premium-workspace.component';
import { PolicyCheckoutComponent } from './features/payment/pages/policy-checkout/policy-checkout.component';
import { PremiumPlansComponent } from './features/premium/pages/premium-plans/premium-plans.component';
import { ComplianceWorkspaceComponent } from './features/compliance/pages/compliance-workspace/compliance-workspace.component';
import { PolicyManagementComponent } from './features/policy/pages/policy-management/policy-management.component';
import { authGuard } from './features/identity/guards/auth.guard';
import { AdministrationComponent } from './features/identity/pages/administration/administration.component';
import { AuthPageComponent } from './features/identity/pages/auth-page/auth-page.component';
import { ComplianceProfileComponent } from './features/identity/pages/compliance-profile/compliance-profile.component';
import { PolicyWorkspaceComponent } from './features/policy/pages/policy-workspace/policy-workspace.component';
import { PolicyProductManagementComponent } from './features/policy/pages/policy-product-management/policy-product-management.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

const loadDashboard = () => import('./features/identity/pages/dashboard/dashboard.component').then((module) => module.DashboardComponent);
const loadClaimsList = () => import('./features/claim/pages/claims-list/claims-list.component').then((module) => module.ClaimsListComponent);

export const routes: Routes = [
	{ path: '', pathMatch: 'full', loadComponent: () => import('./features/landing/pages/landing-page.component').then((module) => module.LandingPageComponent), title: 'Insurance Plans | SureCover' },
	{ path: 'login', component: AuthPageComponent, data: { mode: 'login' }, title: 'Sign in | SureCover' },
	{ path: 'register', component: AuthPageComponent, data: { mode: 'register' }, title: 'Create account | SureCover' },
	{ path: 'forgot-password', component: AuthPageComponent, data: { mode: 'forgot-password' }, title: 'Reset password | SureCover' },
	{ path: 'reset-password', component: AuthPageComponent, data: { mode: 'reset-password' }, title: 'Set password | SureCover' },
	{
		path: '',
		component: AppShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'dashboard', loadComponent: loadDashboard, canActivate: [authGuard], data: { roles: ['PlatformAdmin', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'PaymentOperations', 'SupportAgent'] }, title: 'Dashboard | SureCover' },
			{ path: 'customer/dashboard', loadComponent: loadDashboard, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Dashboard | SureCover' },
			{ path: 'customer/profile', component: CustomerOnboardingComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'My Profile | SureCover' },
			{ path: 'customer/kyc', component: CustomerOnboardingComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'KYC | SureCover' },
			{ path: 'customer/notifications', component: NotificationHistoryComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Notifications | SureCover' },
			{ path: 'customer/insurance-products', component: PolicyWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer'], view: 'products' }, title: 'Insurance Products | SureCover' },
			{ path: 'customer/applications', component: PolicyWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer'], view: 'applications' }, title: 'My Applications | SureCover' },
			{ path: 'customer/policies', component: PolicyWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer'], view: 'policies' }, title: 'My Policies | SureCover' },
			{ path: 'customer/checkout/:policyId', component: PolicyCheckoutComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Checkout | SureCover' },
			{ path: 'customer/claims', loadComponent: loadClaimsList, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'My Claims | SureCover' },
			{ path: 'customer/claims/new', component: ClaimFormComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Submit Claim | SureCover' },
			{ path: 'customer/claims/:claimId', component: ClaimDetailComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Claim Details | SureCover' },
			{ path: 'underwriter/dashboard', loadComponent: loadDashboard, canActivate: [authGuard], data: { roles: ['PolicyUnderwriter'] }, title: 'Underwriting Dashboard | SureCover' },
			{ path: 'underwriter/applications', component: PolicyManagementComponent, canActivate: [authGuard], data: { roles: ['PolicyUnderwriter'], view: 'applications' }, title: 'Policy Applications | SureCover' },
			{ path: 'underwriter/policies', component: PolicyManagementComponent, canActivate: [authGuard], data: { roles: ['PolicyUnderwriter'], view: 'issued' }, title: 'Issued Policies | SureCover' },
			{ path: 'underwriter/notifications', component: NotificationHistoryComponent, canActivate: [authGuard], data: { roles: ['PolicyUnderwriter'] }, title: 'Notifications | SureCover' },
			{ path: 'claims-adjuster/dashboard', loadComponent: loadDashboard, canActivate: [authGuard], data: { roles: ['ClaimsAdjuster'] }, title: 'Claims Dashboard | SureCover' },
			{ path: 'claims-adjuster/claims', loadComponent: loadClaimsList, canActivate: [authGuard], data: { roles: ['ClaimsAdjuster'] }, title: 'Claims Queue | SureCover' },
			{ path: 'claims-adjuster/claims/:claimId', component: ClaimDetailComponent, canActivate: [authGuard], data: { roles: ['ClaimsAdjuster'] }, title: 'Claim Detail | SureCover' },
			{ path: 'claims-adjuster/notifications', component: NotificationHistoryComponent, canActivate: [authGuard], data: { roles: ['ClaimsAdjuster'] }, title: 'Notifications | SureCover' },
			{ path: 'compliance', redirectTo: '/compliance/dashboard', pathMatch: 'full' },
			{ path: 'compliance/dashboard', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'dashboard' }, title: 'Compliance Dashboard | SureCover' },
			{ path: 'compliance/alerts', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'alerts' }, title: 'Compliance Alerts | SureCover' },
			{ path: 'compliance/cases', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'cases' }, title: 'Compliance Cases | SureCover' },
			{ path: 'compliance/cases/:id', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'case-detail' }, title: 'Compliance Case | SureCover' },
			{ path: 'compliance/audit-logs', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'audit-logs' }, title: 'Compliance Audit Logs | SureCover' },
			{ path: 'compliance/reports', component: ComplianceWorkspaceComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'], view: 'reports' }, title: 'Compliance Reports | SureCover' },
			{ path: 'compliance/notifications', component: NotificationHistoryComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'] }, title: 'Notifications | SureCover' },
			{ path: 'compliance/profile', component: ComplianceProfileComponent, canActivate: [authGuard], data: { roles: ['ComplianceOfficer'] }, title: 'Compliance Profile | SureCover' },
			{ path: 'administration', component: AdministrationComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Administration | SureCover' },
			{ path: 'policy-products', component: PolicyProductManagementComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Policy Products | SureCover' },
			{ path: 'policy-management', component: PolicyManagementComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin', 'PolicyUnderwriter'] }, title: 'Policy Management | SureCover' },
			{ path: 'premium-plans', component: PremiumPlansComponent, canActivate: [authGuard], data: { roles: ['PlatformAdmin'] }, title: 'Premium Plans | SureCover' },
			{ path: 'profile', component: CustomerOnboardingComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Profile and KYC | SureCover' },
			{ path: 'kyc-review', component: KycReviewComponent, canActivate: [authGuard], data: { roles: ['KycReviewer'] }, title: 'KYC Approval | SureCover' },
			{ path: 'kyc-history', component: KycHistoryComponent, canActivate: [authGuard], data: { roles: ['KycReviewer'] }, title: 'KYC History | SureCover' },
			{ path: 'kyc-reports', component: KycReportsComponent, canActivate: [authGuard], data: { roles: ['KycReviewer'] }, title: 'KYC Reports | SureCover' },
			{ path: 'customer-search', component: CustomerSearchComponent, canActivate: [authGuard], data: { roles: ['KycReviewer'] }, title: 'Customer Search | SureCover' },
			{ path: 'policies', component: PolicyWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer', 'PolicyUnderwriter', 'SupportAgent'] }, title: 'Policies | SureCover' },
			{ path: 'premiums', component: PremiumWorkspaceComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'Premiums | SureCover' },
			{ path: 'claims', loadComponent: loadClaimsList, canActivate: [authGuard], data: { roles: ['Customer', 'ClaimsAdjuster', 'SupportAgent'] }, title: 'Claims | SureCover' },
			{ path: 'claims/new', component: ClaimFormComponent, canActivate: [authGuard], data: { roles: ['Customer'] }, title: 'New claim | SureCover' },
			{ path: 'claims/:claimId', component: ClaimDetailComponent, canActivate: [authGuard], data: { roles: ['Customer', 'ClaimsAdjuster', 'SupportAgent'] }, title: 'Claim detail | SureCover' },
		],
	},
	{ path: 'customer/assistant', redirectTo: 'ai-assistant', pathMatch: 'full' },
	{
		path: 'ai-assistant',
		canActivate: [authGuard],
		data: { roles: ['Customer'] },
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
