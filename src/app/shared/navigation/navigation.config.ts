export interface NavigationItem {
  label: string;
  route?: string;
  permission?: string;
  disabled?: boolean;
  exact?: boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Overview', route: '/dashboard', exact: true },
  { label: 'Policies', route: '/policies', permission: 'Policy.Read' },
  { label: 'Claims', disabled: true },
  { label: 'Payments', disabled: true },
  { label: 'Profile and KYC', route: '/profile' },
  { label: 'KYC review', route: '/kyc-review', permission: 'Kyc.Verify' }
];