import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { CustomerRequest, CustomerResponse, CustomerUpdateRequest, KycCaseSummary, KycHistoryEntry, KycSubmissionResponse, KycUploadResponse } from '../models/customer.models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/customer-api/api/customers';

  create(request: CustomerRequest): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(this.apiUrl, request);
  }

  getCurrent(): Observable<CustomerResponse | null> {
    return this.http.get<CustomerResponse | null>(`${this.apiUrl}/me`);
  }

  update(customerId: string, request: CustomerUpdateRequest): Observable<CustomerResponse> {
    return this.http.put<CustomerResponse>(`${this.apiUrl}/${customerId}`, request);
  }

  uploadKycDocument(customerId: string, documentType: string, file: File): Observable<KycUploadResponse> {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    return this.http.post<KycUploadResponse>(`/customer-api/api/kyc/customers/${customerId}/documents`, formData);
  }

  getLatestKycSubmission(customerId: string): Observable<KycSubmissionResponse | null> {
    return this.http.get<KycSubmissionResponse | null>(`/customer-api/api/kyc/customers/${customerId}/submission`);
  }

  getPendingKycCases(): Observable<KycCaseSummary[]> {
    return this.http.get<KycCaseSummary[]>('/customer-api/api/kyc/cases/pending');
  }

  getKycCases(status?: string): Observable<KycCaseSummary[]> {
    if (!status || status === 'PendingReview') return this.getPendingKycCases();
    return this.http.get<KycCaseSummary[]>('/customer-api/api/kyc/cases', { params: { status } }).pipe(
      map((cases) => this.mergeCachedKycCases(cases, status)),
      catchError(() => of(this.getCachedKycCases(status)))
    );
  }

  getKycHistory(): Observable<KycHistoryEntry[]> {
    return this.http.get<KycHistoryEntry[]>('/customer-api/api/kyc/cases/history');
  }

  getKycDocument(kycCaseId: string): Observable<Blob> {
    return this.http.get(`/customer-api/api/kyc/cases/${kycCaseId}/document`, { responseType: 'blob' });
  }

  decideKycCase(kycCaseId: string, verify: boolean, rejectionReason?: string): Observable<void> {
    return this.http.post<void>(`/customer-api/api/kyc/cases/${kycCaseId}/decision`, { verify, rejectionReason: rejectionReason || null });
  }

  cacheKycCase(kycCase: KycCaseSummary, status: string): void {
    const cachedCases = this.getCachedKycCases(status).filter((item) => item.id !== kycCase.id);
    localStorage.setItem(`insurance.kyc.${status}`, JSON.stringify([...cachedCases, { ...kycCase, status }]));
  }

  private getCachedKycCases(status: string): KycCaseSummary[] {
    try {
      const value = JSON.parse(localStorage.getItem(`insurance.kyc.${status}`) ?? '[]');
      return Array.isArray(value) ? value as KycCaseSummary[] : [];
    } catch {
      return [];
    }
  }

  private mergeCachedKycCases(cases: KycCaseSummary[], status: string): KycCaseSummary[] {
    const merged = new Map(this.getCachedKycCases(status).map((kycCase) => [kycCase.id, kycCase]));
    for (const kycCase of cases) merged.set(kycCase.id, kycCase);
    return [...merged.values()];
  }
}