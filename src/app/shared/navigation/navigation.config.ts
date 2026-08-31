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
  { label: 'Policy management', route: '/policy-management', roles: ['PlatformAdmin'] },
  { label: 'Policies', route: '/policies', permission: 'Policy.Read' },
  { label: 'Claims', disabled: true },
  { label: 'Payments', disabled: true },
  { label: 'Profile and KYC', route: '/profile', roles: ['Customer'] },
  { label: 'KYC review', route: '/kyc-review', permission: 'Kyc.Verify' }
];