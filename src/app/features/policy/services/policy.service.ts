import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePolicyRequest, PolicyResponse, PolicyType, TransitionPolicyStatusRequest } from '../models/policy.models';
import { UpdatePolicyRequest } from '../models/policy.models';

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/policy-api/api/policies';

  getTypes(): Observable<PolicyType[]> { return this.http.get<PolicyType[]>(`${this.apiUrl}/types`); }
  getAll(): Observable<PolicyResponse[]> { return this.http.get<PolicyResponse[]>(this.apiUrl); }
  getMine(customerId: string): Observable<PolicyResponse[]> { return this.http.get<PolicyResponse[]>(`${this.apiUrl}/mine`, { params: { customerId } }); }
  create(request: CreatePolicyRequest): Observable<PolicyResponse> { return this.http.post<PolicyResponse>(this.apiUrl, request); }
  update(policyId: string, request: UpdatePolicyRequest): Observable<PolicyResponse> { return this.http.put<PolicyResponse>(`${this.apiUrl}/${policyId}`, request); }
  transitionStatus(policyId: string, request: TransitionPolicyStatusRequest): Observable<PolicyResponse> { return this.http.patch<PolicyResponse>(`${this.apiUrl}/${policyId}/status`, request); }
}