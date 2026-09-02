import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerRequest, CustomerResponse, CustomerUpdateRequest, KycCaseSummary, KycSubmissionResponse, KycUploadResponse } from '../models/customer.models';

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

  getKycDocument(kycCaseId: string): Observable<Blob> {
    return this.http.get(`/customer-api/api/kyc/cases/${kycCaseId}/document`, { responseType: 'blob' });
  }

  decideKycCase(kycCaseId: string, verify: boolean, rejectionReason?: string): Observable<void> {
    return this.http.post<void>(`/customer-api/api/kyc/cases/${kycCaseId}/decision`, { verify, rejectionReason: rejectionReason || null });
  }
}