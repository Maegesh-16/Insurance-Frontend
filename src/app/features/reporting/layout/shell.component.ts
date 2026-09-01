import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  caption: string;
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="workspace-shell">
      <aside class="workspace-sidebar">
        <div>
          <p class="brand-kicker">Reporting Service</p>
          <h1 class="brand-title">Control Center</h1>
          <p class="brand-copy">
            Operational dashboards, reporting catalog control, execution monitoring, and archived output review.
          </p>
        </div>

        <nav class="nav-stack" aria-label="Primary navigation">
          @for (item of navItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-link">
              <span class="nav-label">{{ item.label }}</span>
              <span class="nav-caption">{{ item.caption }}</span>
            </a>
          }
        </nav>

        <section class="session-card">
          <p class="eyebrow">Authenticated Session</p>
          <p><strong>{{ authService.session()?.email }}</strong></p>
          <p class="brand-copy">Roles: {{ authService.session()?.roles?.join(', ') || 'None' }}</p>
          <span class="soft-badge">User ID {{ authService.session()?.userId }}</span>
          <div class="card-actions" style="margin-top: 16px;">
            <button class="ghost-button" type="button" (click)="authService.logout()">Sign out</button>
          </div>
        </section>
      </aside>

      <div class="workspace-main">
        <header class="workspace-topbar">
          <div>
            <p class="page-kicker">Angular Workspace</p>
            <h1>Reporting Operations Workspace</h1>
          </div>
          <span class="topbar-badge">Backend-aligned frontend foundation</span>
        </header>

        <main class="workspace-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class ShellComponent {
  protected readonly authService = inject(AuthService);
  protected readonly navItems = computed(() =>
    this.allNavItems.filter((item) => !item.roles?.length || this.authService.hasAnyRole(item.roles))
  );

  private readonly allNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', caption: 'KPIs and delivery queue' },
    { path: '/claim-reports', label: 'Claim Reports', caption: 'Claims operations and settlement visibility' },
    { path: '/revenue-reports', label: 'Revenue Reports', caption: 'Premium and financial performance' },
    { path: '/policy-statistics', label: 'Policy Statistics', caption: 'Portfolio growth and lifecycle trends' },
    { path: '/branch-reports', label: 'Branch Reports', caption: 'Regional and branch-level performance' },
    { path: '/dashboard-reports', label: 'Dashboard Reports', caption: 'Executive KPI rollups and summaries' },
    { path: '/report-requests', label: 'Requests', caption: 'Ad-hoc and generated output', roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
    { path: '/execution-history', label: 'Execution History', caption: 'Workers, timing, and failures', roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
    { path: '/report-snapshots', label: 'Snapshots', caption: 'Historical archived summaries', roles: ['Admin', 'ReportingAdmin', 'Manager', 'ReportingViewer'] },
    { path: '/report-definitions', label: 'Definitions', caption: 'Catalog and output defaults', roles: ['Admin', 'ReportingAdmin'] },
    { path: '/scheduled-reports', label: 'Schedules', caption: 'Cron-driven automation', roles: ['Admin', 'ReportingAdmin'] },
    { path: '/dashboard-metrics', label: 'Metrics', caption: 'Pre-calculated analytics', roles: ['Admin', 'ReportingAdmin'] },
    { path: '/lookups', label: 'Lookups', caption: 'Reference data across modules', roles: ['Admin', 'ReportingAdmin'] }
  ];
}