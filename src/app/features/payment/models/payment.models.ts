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

export interface CheckoutPaymentRequest {
  policyId: string;
  amount: number;
  method: string;
}

export interface PaymentTransaction {
  transactionId: string;
  paymentId: string;
  gatewayRef: string;
  status: string;
}

export interface PaymentReceipt {
  receiptId: string;
  paymentId: string;
  receiptNumber: string;
  generatedDate: string;
}

export interface CheckoutPaymentResponse {
  payment: Payment;
  transaction: PaymentTransaction;
  receipt: PaymentReceipt;
}