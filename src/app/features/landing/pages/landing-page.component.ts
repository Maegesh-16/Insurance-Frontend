import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideBadgeCheck, LucideCar, LucideChevronRight, LucideHeartPulse, LucideHome, LucidePlane, LucideShieldCheck } from '@lucide/angular';
import { AuthService } from '../../identity/services/auth.service';

interface PolicyProduct {
  name: string;
  description: string;
  price: string;
  icon: 'health' | 'life' | 'motor' | 'home' | 'travel';
}

interface NavigationPreview {
  label: string;
  detail: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, LucideArrowRight, LucideBadgeCheck, LucideCar, LucideChevronRight, LucideHeartPulse, LucideHome, LucidePlane, LucideShieldCheck],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly products: PolicyProduct[] = [
    { name: 'Health cover', description: 'Cashless care for individuals and families.', price: 'From INR 510/mo', icon: 'health' },
    { name: 'Term life', description: 'Long-term financial protection for the people you love.', price: 'From INR 390/mo', icon: 'life' },
    { name: 'Car insurance', description: 'Comprehensive cover for every drive.', price: 'From INR 620/mo', icon: 'motor' },
    { name: 'Home protection', description: 'Cover for your home, belongings, and peace of mind.', price: 'From INR 460/mo', icon: 'home' },
    { name: 'Travel cover', description: 'Medical and trip support wherever you go.', price: 'From INR 180/trip', icon: 'travel' }
  ];

  protected readonly claimBars = [42, 58, 49, 72, 66, 84, 78];
  protected readonly monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  protected readonly productPreviews: NavigationPreview[] = [
    { label: 'Health cover', detail: 'Cashless care for individuals and families' },
    { label: 'Term life', detail: 'Long-term protection for your family' },
    { label: 'Car insurance', detail: 'Comprehensive cover for every drive' },
    { label: 'Travel cover', detail: 'Medical and trip support worldwide' }
  ];
  protected readonly impactPreviews: NavigationPreview[] = [
    { label: '1.2M customers', detail: 'Protected across India' },
    { label: '96% satisfaction', detail: 'From resolved claim support' },
    { label: 'INR 840Cr supported', detail: 'Claims assistance to date' }
  ];
  protected readonly claimPreviews: NavigationPreview[] = [
    { label: 'Track a claim', detail: 'Follow every update in one place' },
    { label: 'Cashless support', detail: 'Guidance for eligible treatment' },
    { label: 'Talk to an expert', detail: 'Human help when it matters' }
  ];

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl(this.dashboardRoute());
    }
  }

  private dashboardRoute(): string {
    const roles = this.authService.getSession()?.roles ?? [];
    if (roles.includes('Customer')) return '/customer/dashboard';
    if (roles.includes('PolicyUnderwriter')) return '/underwriter/dashboard';
    if (roles.includes('ClaimsAdjuster')) return '/claims-adjuster/dashboard';
    if (roles.includes('ComplianceOfficer')) return '/compliance/dashboard';
    return '/dashboard';
  }
}