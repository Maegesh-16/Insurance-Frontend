export interface PolicyType {
  id: string;
  code: string;
  name: string;
  description: string;
  basePremium: number;
}

export interface CoverageRequest {
  name: string;
  description: string;
  sumInsured: number;
  deductible: number;
}

export interface CreatePolicyRequest {
  policyNumber: string;
  customerId: string;
  policyTypeId: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  coverages: CoverageRequest[];
  remarks: string | null;
}

export interface PolicyResponse extends CreatePolicyRequest {
  id: string;
  policyType: PolicyType;
  status: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  history: Array<{ id: string; action: string; status: number; remarks: string; changedAtUtc: string }>;
}