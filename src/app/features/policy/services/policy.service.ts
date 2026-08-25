import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePolicyRequest, PolicyResponse, PolicyType } from '../models/policy.models';

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/policy-api/api/policies';

  getTypes(): Observable<PolicyType[]> { return this.http.get<PolicyType[]>(`${this.apiUrl}/types`); }
  getMine(customerId: string): Observable<PolicyResponse[]> { return this.http.get<PolicyResponse[]>(`${this.apiUrl}/mine`, { params: { customerId } }); }
  create(request: CreatePolicyRequest): Observable<PolicyResponse> { return this.http.post<PolicyResponse>(this.apiUrl, request); }
}