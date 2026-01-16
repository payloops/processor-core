export interface PaymentConfig {
  merchantId: string;
  processor: string;
  testMode: boolean;
  credentials: Record<string, string>;
}

export interface PaymentInput {
  orderId: string;
  merchantId: string;
  amount: number;
  currency: string;
  processor: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
  customer?: {
    id?: string;
    email?: string;
    name?: string;
  };
  paymentMethod?: {
    type: 'card' | 'upi' | 'netbanking' | 'wallet';
    token?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  status: 'authorized' | 'captured' | 'failed' | 'pending' | 'requires_action';
  processorOrderId?: string;
  processorTransactionId?: string;
  redirectUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundInput {
  orderId: string;
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'success' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookDeliveryInput {
  webhookEventId: string;
  merchantId: string;
  webhookUrl: string;
  webhookSecret?: string;
  payload: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  attempts: number;
  deliveredAt?: Date;
  errorMessage?: string;
}

// Processor interface that each processor must implement
export interface PaymentProcessor {
  name: string;

  createPayment(input: PaymentInput, config: PaymentConfig): Promise<PaymentResult>;

  capturePayment(
    processorOrderId: string,
    amount: number,
    config: PaymentConfig
  ): Promise<PaymentResult>;

  refundPayment(
    processorTransactionId: string,
    amount: number,
    config: PaymentConfig
  ): Promise<RefundResult>;

  getPaymentStatus(
    processorOrderId: string,
    config: PaymentConfig
  ): Promise<PaymentResult>;
}

// Processor registry type
export type ProcessorRegistry = Map<string, PaymentProcessor>;
