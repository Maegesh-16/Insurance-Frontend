import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{
		path: 'login',
		title: 'Login | Reporting Service',
		loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent)
	},
	{
		path: '',
		canActivate: [authGuard],
		loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard'
			},
			{
				path: 'dashboard',
				title: 'Dashboard | Reporting Service',
				loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent)
			},
			{
				path: 'claim-reports',
				title: 'Claim Reports | Reporting Service',
				loadComponent: () => import('./features/report-categories/report-category-page.component').then((m) => m.ReportCategoryPageComponent),
				data: {
					title: 'Claim Reports',
					categoryCode: 'Claim',
					audience: 'Claims officers, administrators, and management',
					summary: 'Claim reporting supports incident analysis, claim throughput visibility, and approval tracking for operational review.',
					useCases: ['Claim volume review', 'Claim settlement tracking', 'Claims backlog monitoring']
				}
			},
			{
				path: 'revenue-reports',
				title: 'Revenue Reports | Reporting Service',
				loadComponent: () => import('./features/report-categories/report-category-page.component').then((m) => m.ReportCategoryPageComponent),
				data: {
					title: 'Revenue Reports',
					categoryCode: 'Revenue',
					audience: 'Finance teams, management, and administrators',
					summary: 'Revenue reporting supports premium collection monitoring, financial reconciliation, and executive revenue visibility.',
					useCases: ['Premium revenue analysis', 'Branch revenue comparison', 'Payment and settlement reconciliation']
				}
			},
			{
				path: 'policy-statistics',
				title: 'Policy Statistics | Reporting Service',
				loadComponent: () => import('./features/report-categories/report-category-page.component').then((m) => m.ReportCategoryPageComponent),
				data: {
					title: 'Policy Statistics',
					categoryCode: 'PolicyStatistics',
					audience: 'Underwriters, management, and reporting administrators',
					summary: 'Policy statistics provide lifecycle visibility across onboarding, activation, renewals, and portfolio health.',
					useCases: ['Policy growth tracking', 'Renewal and lapse analysis', 'Underwriting portfolio summaries']
				}
			},
			{
				path: 'branch-reports',
				title: 'Branch Reports | Reporting Service',
				loadComponent: () => import('./features/report-categories/report-category-page.component').then((m) => m.ReportCategoryPageComponent),
				data: {
					title: 'Branch Reports',
					categoryCode: 'Branch',
					audience: 'Regional managers, operations, and administrators',
					summary: 'Branch reporting helps compare distributed operations, service quality, and local financial or claims performance.',
					useCases: ['Branch performance review', 'Regional claim trend comparison', 'Service delivery variance analysis']
				}
			},
			{
				path: 'dashboard-reports',
				title: 'Dashboard Reports | Reporting Service',
				loadComponent: () => import('./features/report-categories/report-category-page.component').then((m) => m.ReportCategoryPageComponent),
				data: {
					title: 'Dashboard Reports',
					categoryCode: 'Dashboard',
					audience: 'Management and reporting administrators',
					summary: 'Dashboard-oriented reports aggregate the highest-signal operational KPIs for rapid decision making.',
					useCases: ['Executive KPI rollups', 'Daily operational summary', 'Cross-service health visibility']
				}
			},
			{
				path: 'report-definitions',
				title: 'Report Definitions | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin'] },
				loadComponent: () => import('./features/report-definitions/report-definitions-page.component').then((m) => m.ReportDefinitionsPageComponent)
			},
			{
				path: 'report-requests',
				title: 'Report Requests | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
				loadComponent: () => import('./features/report-requests/report-requests-page.component').then((m) => m.ReportRequestsPageComponent)
			},
			{
				path: 'execution-history',
				title: 'Execution History | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
				loadComponent: () => import('./features/execution-history/execution-history-page.component').then((m) => m.ExecutionHistoryPageComponent)
			},
			{
				path: 'report-snapshots',
				title: 'Snapshots | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
				loadComponent: () => import('./features/report-snapshots/report-snapshots-page.component').then((m) => m.ReportSnapshotsPageComponent)
			},
			{
				path: 'scheduled-reports',
				title: 'Scheduled Reports | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin'] },
				loadComponent: () => import('./features/scheduled-reports/scheduled-reports-page.component').then((m) => m.ScheduledReportsPageComponent)
			},
			{
				path: 'dashboard-metrics',
				title: 'Dashboard Metrics | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin'] },
				loadComponent: () => import('./features/dashboard-metrics/dashboard-metrics-page.component').then((m) => m.DashboardMetricsPageComponent)
			},
			{
				path: 'lookups',
				title: 'Lookups | Reporting Service',
				canActivate: [roleGuard],
				data: { roles: ['Admin', 'ReportingAdmin'] },
				loadComponent: () => import('./features/lookups/lookups-page.component').then((m) => m.LookupsPageComponent)
			}
		]
	},
	{
		path: '**',
		redirectTo: ''
	}
];
