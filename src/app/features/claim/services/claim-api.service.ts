import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ClaimDetail, ClaimLookup, ClaimSummary, CreateClaimRequest } from '../models/claim.models';

@Injectable({ providedIn: 'root' })
export class ClaimApiService {
  private readonly http = inject(HttpClient);
  private readonly api = '/claim-api/api';

  getClaims() { return this.http.get<ClaimSummary[]>(`${this.api}/claims`); }
  getClaim(claimId: number) { return this.http.get<ClaimDetail>(`${this.api}/claims/${claimId}`); }
  createClaim(request: CreateClaimRequest) { return this.http.post<ClaimDetail>(`${this.api}/claims`, request); }
  getClaimTypes() { return this.http.get<ClaimLookup[]>(`${this.api}/claim-lookups/types`); }
  getClaimStatuses() { return this.http.get<ClaimLookup[]>(`${this.api}/claim-lookups/statuses`); }
  getPriorities() { return this.http.get<ClaimLookup[]>(`${this.api}/claim-lookups/priorities`); }
}