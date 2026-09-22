import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the idempotency key supplied by the payment operation', () => {
    const payment = {
      policyId: 'policy-1',
      amount: 2500,
      method: 'Online',
      status: 'Completed',
      paymentDate: '2026-09-21T00:00:00.000Z'
    };

    service.createPayment(payment, 'payment-attempt-1').subscribe();

    const request = http.expectOne('/payment-api/api/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payment);
    expect(request.request.headers.get('Idempotency-Key')).toBe('payment-attempt-1');
    request.flush({ paymentId: 'payment-1', ...payment });
  });
});