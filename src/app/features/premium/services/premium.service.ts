import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePremiumPlanRequest, CreatePremiumScheduleRequest, PremiumCalculation, PremiumDiscount, PremiumHistory, PremiumPlan, PremiumSchedule } from '../models/premium.models';

@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/premium-api/api/premium';
  private readonly schedulesApiUrl = '/payment-api/api/premium/schedules';

  getPlans(): Observable<PremiumPlan[]> { return this.http.get<PremiumPlan[]>(`${this.apiUrl}/plans`); }
  createPlan(request: CreatePremiumPlanRequest): Observable<PremiumPlan> { return this.http.post<PremiumPlan>(`${this.apiUrl}/plans`, request); }
  getSchedules(policyId: string): Observable<PremiumSchedule[]> { return this.http.get<PremiumSchedule[]>(this.schedulesApiUrl, { params: new HttpParams().set('policyId', policyId) }); }
  createSchedules(request: CreatePremiumScheduleRequest): Observable<PremiumSchedule[]> { return this.http.post<PremiumSchedule[]>(this.schedulesApiUrl, request); }
  getHistory(policyId: string): Observable<PremiumHistory[]> { return this.http.get<PremiumHistory[]>(`${this.apiUrl}/history`, { params: new HttpParams().set('policyId', policyId) }); }
  getDiscounts(policyId: string): Observable<PremiumDiscount[]> { return this.http.get<PremiumDiscount[]>(`${this.apiUrl}/discounts`, { params: new HttpParams().set('policyId', policyId) }); }
  calculate(policyId: string, policyTypeId: string, frequency: string): Observable<PremiumCalculation> {
    return this.http.post<PremiumCalculation>(`${this.apiUrl}/calculate`, { policyId, policyTypeId, frequency });
  }
}