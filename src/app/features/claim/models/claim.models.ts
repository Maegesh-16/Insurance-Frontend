export interface ClaimLookup {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ClaimSummary {
  claimId: number;
  claimNumber: string;
  policyId: number;
  customerId: number;
  claimTypeId: number;
  claimTypeName: string;
  claimStatusId: number;
  claimStatusName: string;
  priorityId: number;
  priorityName: string;
  incidentDate: string;
  reportedAt: string;
  claimAmount: number;
  approvedAmount?: number | null;
  settledAmount?: number | null;
  assignedToUserId?: number | null;
}

export interface ClaimDetail extends ClaimSummary {
  currencyCode: string;
  causeOfLoss: string;
  lossDescription: string;
  incidentLocation?: string | null;
  fraudRiskScore?: number | null;
  claimStatus?: ClaimLookup;
  documents: ClaimDocument[];
  assessments: ClaimAssessment[];
  parties: ClaimParty[];
  settlements: ClaimSettlement[];
  statusHistory: ClaimStatusHistory[];
  actionHistory: ClaimActionHistory[];
}

export interface ClaimDocument {
  claimDocumentId: number;
  originalFileName: string;
  fileSizeBytes: number;
  documentType?: ClaimLookup;
}

export interface ClaimAssessment {
  claimAssessmentId: number;
  recommendedAmount?: number | null;
  assessmentSummary?: string | null;
  assessmentStatus?: ClaimLookup;
}

export interface ClaimParty {
  claimPartyId: number;
  name: string;
  email?: string | null;
  contactNumber?: string | null;
  partyType?: ClaimLookup;
}

export interface ClaimSettlement {
  claimSettlementId: number;
  netPayableAmount?: number | null;
  paymentStatus?: ClaimLookup;
  paidToName?: string | null;
}

export interface ClaimStatusHistory {
  claimStatusHistoryId: number;
  changedAt: string;
  comments?: string | null;
  currentStatus?: ClaimLookup;
}

export interface ClaimActionHistory {
  claimActionHistoryId: number;
  actionAt: string;
  remarks?: string | null;
  actionType?: ClaimLookup;
}

export interface CreateClaimRequest {
  policyId: number;
  customerId: number;
  claimNumber: string;
  claimTypeId: number;
  claimStatusId: number;
  incidentDate: string;
  reportedAt: string;
  claimAmount: number;
  currencyCode: string;
  causeOfLoss: string;
  lossDescription: string;
  priorityId: number;
  incidentLocation?: string | null;
}