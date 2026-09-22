export const PREMIUM_FREQUENCIES = [
  { value: 'Monthly', label: 'Monthly', installmentsPerYear: 12 },
  { value: 'Quarterly', label: 'Quarterly', installmentsPerYear: 4 },
  { value: 'HalfYearly', label: 'Half-yearly', installmentsPerYear: 2 },
  { value: 'Annual', label: 'Annually', installmentsPerYear: 1 }
] as const;

export type PremiumFrequency = typeof PREMIUM_FREQUENCIES[number]['value'];

export function installmentPremium(annualPremium: number, frequency: PremiumFrequency): number {
  const installments = PREMIUM_FREQUENCIES.find((item) => item.value === frequency)?.installmentsPerYear ?? 1;
  return Math.round((annualPremium / installments) * 100) / 100;
}

export interface PremiumPlan {
  planId: string;
  policyTypeId: string;
  frequency: string;
  basePremium: number;
}

export interface CreatePremiumPlanRequest {
  policyTypeId: string;
  frequency: PremiumFrequency;
  basePremium: number;
}

export interface PremiumCalculation {
  policyId: string;
  planId: string;
  basePremium: number;
  discountPercentage: number;
  discountAmount: number;
  payableAmount: number;
}

export interface PremiumSchedule {
  scheduleId: string;
  policyId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paymentId: string | null;
  paidDate: string | null;
}

export interface PremiumHistory {
  historyId: string;
  policyId: string;
  paymentId: string;
  paidDate: string;
  amount: number;
}

export interface PremiumDiscount {
  discountId: string;
  policyId: string;
  discountType: string;
  percentage: number;
}