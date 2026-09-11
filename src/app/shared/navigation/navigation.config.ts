export interface NavigationItem {
  label: string;
  route?: string;
  permission?: string;
  roles?: readonly string[];
  disabled?: boolean;
  exact?: boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Overview', route: '/dashboard', roles: ['PlatformAdmin', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'PaymentOperations', 'SupportAgent'], exact: true },
  { label: 'Dashboard', route: '/customer/dashboard', roles: ['Customer'], exact: true },
  { label: 'My Profile', route: '/customer/profile', roles: ['Customer'] },
  { label: 'KYC', route: '/customer/kyc', roles: ['Customer'] },
  { label: 'Insurance Products', route: '/customer/insurance-products', roles: ['Customer'] },
  { label: 'My Applications', route: '/customer/applications', roles: ['Customer'] },
  { label: 'My Policies', route: '/customer/policies', roles: ['Customer'] },
  { label: 'Payments', route: '/customer/payments', roles: ['Customer'] },
  { label: 'My Claims', route: '/customer/claims', roles: ['Customer'] },
  { label: 'Notifications', route: '/customer/notifications', roles: ['Customer'] },
  { label: 'AI assistant', route: '/customer/assistant', roles: ['Customer'] },
  { label: 'Dashboard', route: '/underwriter/dashboard', roles: ['PolicyUnderwriter'], exact: true },
  { label: 'Policy Applications', route: '/underwriter/applications', roles: ['PolicyUnderwriter'] },
  { label: 'Issued Policies', route: '/underwriter/policies', roles: ['PolicyUnderwriter'] },
  { label: 'Notifications', route: '/underwriter/notifications', roles: ['PolicyUnderwriter'] },
  { label: 'Dashboard', route: '/claims-adjuster/dashboard', roles: ['ClaimsAdjuster'], exact: true },
  { label: 'Claims', route: '/claims-adjuster/claims', roles: ['ClaimsAdjuster'] },
  { label: 'Notifications', route: '/claims-adjuster/notifications', roles: ['ClaimsAdjuster'] },
  { label: 'Dashboard', route: '/compliance/dashboard', roles: ['ComplianceOfficer'], exact: true },
  { label: 'Alerts', route: '/compliance/alerts', roles: ['ComplianceOfficer'] },
  { label: 'Cases', route: '/compliance/cases', roles: ['ComplianceOfficer'] },
  { label: 'Audit logs', route: '/compliance/audit-logs', roles: ['ComplianceOfficer'] },
  { label: 'Reports', route: '/compliance/reports', roles: ['ComplianceOfficer'] },
  { label: 'Profile', route: '/compliance/profile', roles: ['ComplianceOfficer'] },
  { label: 'User administration', route: '/administration', roles: ['PlatformAdmin'] },
  { label: 'Premium plans', route: '/premium-plans', roles: ['PlatformAdmin'] },
  { label: 'Policies', route: '/policies', roles: ['SupportAgent'] },
  { label: 'KYC approval', route: '/kyc-review', roles: ['KycReviewer'] },
  { label: 'Claims', route: '/claims', roles: ['SupportAgent'] },
  { label: 'Payments', roles: ['PaymentOperations', 'SupportAgent'], disabled: true },
  { label: 'Reporting', route: '/reporting', roles: ['ClaimsAdjuster', 'PaymentOperations'] },
  { label: 'AI assistant', route: '/ai-assistant', roles: ['PolicyUnderwriter', 'ClaimsAdjuster', 'PlatformAdmin'] }
];