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
  { label: 'Policies', route: '/policies', permission: 'Policy.Read' },
  { label: 'Claims', disabled: true },
  { label: 'Premiums', route: '/premiums', roles: ['Customer'] },
  { label: 'Payments', disabled: true },
  { label: 'Notifications', route: '/notifications', roles: ['Customer'] },
  { label: 'Profile and KYC', route: '/profile', roles: ['Customer'] },
  { label: 'KYC review', route: '/kyc-review', permission: 'Kyc.Verify' }
];