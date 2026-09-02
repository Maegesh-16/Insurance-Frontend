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
  customerId: string;
  policyTypeId: string;
  startDate: string;
  endDate: string;
  coverages: CoverageRequest[];
  remarks: string | null;
}

export interface UpdatePolicyRequest {
  customerId: string;
  policyTypeId: string;
  startDate: string;
  endDate: string;
  status: number;
  coverages: CoverageRequest[];
  remarks: string;
}

export interface PolicyResponse {
  id: string;
  policyNumber: string;
  customerId: string;
  policyTypeId: string;
  policyType: PolicyType;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  status: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  coverages: CoverageRequest[];
  remarks: string | null;
  history: Array<{ id: string; action: string; status: number; remarks: string; changedAtUtc: string }>;
}

export interface TransitionPolicyStatusRequest {
  status: number;
  remarks: string;
}