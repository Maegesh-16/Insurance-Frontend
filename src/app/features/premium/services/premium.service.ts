import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PremiumCalculation, PremiumDiscount, PremiumHistory, PremiumPlan, PremiumSchedule } from '../models/premium.models';

@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/premium-api/api/premium';

  getPlans(): Observable<PremiumPlan[]> { return this.http.get<PremiumPlan[]>(`${this.apiUrl}/plans`); }
  getSchedules(policyId: string): Observable<PremiumSchedule[]> { return this.http.get<PremiumSchedule[]>(`${this.apiUrl}/schedules`, { params: new HttpParams().set('policyId', policyId) }); }
  getHistory(policyId: string): Observable<PremiumHistory[]> { return this.http.get<PremiumHistory[]>(`${this.apiUrl}/history`, { params: new HttpParams().set('policyId', policyId) }); }
  getDiscounts(policyId: string): Observable<PremiumDiscount[]> { return this.http.get<PremiumDiscount[]>(`${this.apiUrl}/discounts`, { params: new HttpParams().set('policyId', policyId) }); }
  calculate(policyId: string, policyTypeId: string, frequency: string): Observable<PremiumCalculation> {
    return this.http.post<PremiumCalculation>(`${this.apiUrl}/calculate`, { policyId, policyTypeId, frequency });
  }
}