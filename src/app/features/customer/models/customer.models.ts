export interface CustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: AddressRequest | null;
  nominee: NomineeRequest | null;
  kyc: KycRequest;
}

export interface AddressRequest { line1: string; line2: string | null; city: string; state: string; postalCode: string; country: string; }
export interface NomineeRequest { fullName: string; relationship: string; phoneNumber: string; email: string | null; }
export interface KycRequest { documentType: string; documentNumber: string; status: 1; verifiedAtUtc: null; }
export interface CustomerKycResponse { documentType: string; documentNumber: string; status: number; verifiedAtUtc: string | null; }
export interface CustomerResponse extends Omit<CustomerRequest, 'kyc'> { id: string; identityUserId: string; isActive: boolean; createdAtUtc: string; updatedAtUtc: string | null; kyc: CustomerKycResponse | null; }
export interface CustomerUpdateRequest extends Omit<CustomerRequest, 'kyc'> { isActive: boolean; kyc: null; }
export interface KycUploadResponse { kycCaseId: string; status: string; }
export interface KycCaseSummary {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  documentType: string;
  contentType: string;
  sizeBytes: number;
  submittedAtUtc: string;
  riskScore: number;
}