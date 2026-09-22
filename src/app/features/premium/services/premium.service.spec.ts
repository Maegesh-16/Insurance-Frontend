import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PremiumPlan } from '../models/premium.models';
import { PremiumService } from './premium.service';

describe('PremiumService', () => {
  let service: PremiumService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PremiumService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('exposes premium plans to the customer application', () => {
    const plans: PremiumPlan[] = [{ planId: 'plan-1', policyTypeId: 'type-1', frequency: 'Monthly', basePremium: 2000 }];

    service.getPlans().subscribe((result) => expect(result).toEqual(plans));

    const request = http.expectOne('/premium-api/api/premium/plans');
    expect(request.request.method).toBe('GET');
    request.flush(plans);
  });

  it('sends the selected policy type and frequency unchanged for calculation', () => {
    service.calculate('policy-1', 'type-1', 'Quarterly').subscribe();

    const request = http.expectOne('/premium-api/api/premium/calculate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ policyId: 'policy-1', policyTypeId: 'type-1', frequency: 'Quarterly' });
    request.flush({ policyId: 'policy-1', planId: 'plan-1', basePremium: 6000, discountPercentage: 0, discountAmount: 0, payableAmount: 6000 });
  });
});