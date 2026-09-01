export interface NavigationItem {
  label: string;
  route?: string;
  permission?: string;
  roles?: readonly string[];
  disabled?: boolean;
  exact?: boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Overview', route: '/dashboard', exact: true },
  { label: 'User administration', route: '/administration', roles: ['PlatformAdmin'] },
  { label: 'Premium plans', route: '/premium-plans', roles: ['PlatformAdmin'] },
  { label: 'Policy management', route: '/policy-management', roles: ['PlatformAdmin'] },
  { label: 'Profile and KYC', route: '/profile', roles: ['Customer'] },
  { label: 'Policies', route: '/policies', roles: ['Customer', 'PolicyUnderwriter', 'SupportAgent'] },
  { label: 'Premiums', route: '/premiums', roles: ['Customer'] },
  { label: 'Notifications', route: '/notifications', roles: ['Customer'] },
  { label: 'KYC review', route: '/kyc-review', roles: ['KycReviewer'] },
  { label: 'Claims', route: '/claims', roles: ['Customer', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer'] },
  { label: 'Payments', roles: ['Customer', 'PaymentOperations', 'SupportAgent'], disabled: true },
  { label: 'Reporting', route: '/reporting', roles: ['ComplianceOfficer', 'ClaimsAdjuster', 'PaymentOperations'] },
  { label: 'AI assistant', route: '/ai-assistant', roles: ['Customer', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin'] }
];