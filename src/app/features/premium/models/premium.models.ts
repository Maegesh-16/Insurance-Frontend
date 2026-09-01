export interface PremiumPlan {
  planId: string;
  policyTypeId: string;
  frequency: string;
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