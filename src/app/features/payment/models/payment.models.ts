export interface Payment {
  paymentId: string;
  policyId: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
}

export interface CreatePaymentRequest {
  policyId: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
}