import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CheckoutPaymentRequest, CheckoutPaymentResponse, CreatePaymentRequest, Payment } from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/payment-api/api/payments';

  getPayments(policyId?: string): Observable<Payment[]> {
    const params = policyId ? new HttpParams().set('policyId', policyId) : undefined;
    return this.http.get<Payment[]>(this.apiUrl, { params });
  }

  createPayment(request: CreatePaymentRequest, idempotencyKey: string): Observable<Payment> {
    return this.http.post<Payment>(this.apiUrl, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
    });
  }

  checkout(request: CheckoutPaymentRequest, idempotencyKey: string): Observable<CheckoutPaymentResponse> {
    return this.http.post<CheckoutPaymentResponse>(`${this.apiUrl}/checkout`, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
    });
  }
}