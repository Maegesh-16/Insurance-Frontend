import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePaymentRequest, Payment } from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/payment-api/api/payments';

  getPayments(policyId?: string): Observable<Payment[]> {
    const params = policyId ? new HttpParams().set('policyId', policyId) : undefined;
    return this.http.get<Payment[]>(this.apiUrl, { params });
  }

  createPayment(request: CreatePaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(this.apiUrl, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() })
    });
  }
}