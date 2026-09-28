import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-compliance-workspace',
  imports: [RouterLink],
  templateUrl: './compliance-workspace.component.html'
})
export class ComplianceWorkspaceComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly view = this.route.snapshot.data['view'] as string;

  protected get heading(): string {
    return ({
      dashboard: 'Compliance dashboard',
      alerts: 'Compliance alerts',
      cases: 'Compliance cases',
      'case-detail': 'Compliance case',
      'audit-logs': 'Audit logs',
      reports: 'Compliance reports'
    } as Record<string, string>)[this.view] ?? 'Compliance workspace';
  }

  protected get description(): string {
    return ({
      dashboard: 'Monitor governed activity across the insurance platform.',
      alerts: 'Review exceptions that require compliance attention.',
      cases: 'Review compliance cases and their current status.',
      'case-detail': 'Review the selected compliance case.',
      'audit-logs': 'Review recorded platform activity and decisions.',
      reports: 'Review compliance reporting and trends.'
    } as Record<string, string>)[this.view] ?? 'Review compliance activity.';
  }
}
