# @payloops/processor-core

Temporal workflows and core processor logic for PayLoops payment platform.

## Features

- PaymentWorkflow with 3DS signal support
- WebhookDeliveryWorkflow with exponential backoff retry
- PaymentProcessor interface and registry
- Database and processor activities
- Integration with @astami/temporal-functions

## Tech Stack

- **Workflow Engine**: Temporal + @astami/temporal-functions
- **Language**: TypeScript
- **Database**: PostgreSQL + Drizzle ORM

## Development

```bash
# Install dependencies
pnpm install

# Start worker (with hot reload)
pnpm dev

# Type check
pnpm typecheck

# Build library
pnpm build

# Run production worker
pnpm start
```

## Environment Variables

```bash
# Copy example env file
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `TEMPORAL_ADDRESS` | Temporal server address |
| `TEMPORAL_NAMESPACE` | Temporal namespace |
| `ENCRYPTION_KEY` | Key for decrypting processor credentials |

## Workflows

### PaymentWorkflow

Handles the complete payment lifecycle:

1. **Create Order** - Initialize payment order
2. **Route Payment** - Select processor based on rules
3. **Charge** - Process payment with selected processor
4. **Handle 3DS** - Wait for 3DS confirmation signal if required
5. **Confirm** - Finalize payment

```typescript
// Signals
- threeDSComplete(result: { success: boolean; paymentId?: string })
```

### WebhookDeliveryWorkflow

Delivers webhooks to merchant endpoints:

1. **Attempt Delivery** - POST to merchant webhook URL
2. **Retry on Failure** - Exponential backoff (1min, 5min, 30min, 2hr, 24hr)
3. **Mark Final Status** - Success or permanently failed

## Processor Interface

```typescript
interface PaymentProcessor {
  name: string;
  createPayment(input: PaymentInput, config: PaymentConfig): Promise<PaymentResult>;
  capturePayment(orderId: string, amount: number, config: PaymentConfig): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number, config: PaymentConfig): Promise<RefundResult>;
  getPaymentStatus(orderId: string, config: PaymentConfig): Promise<PaymentResult>;
}
```

## Adding a New Processor

See [processor-stripe](https://github.com/payloops/processor-stripe) or [processor-razorpay](https://github.com/payloops/processor-razorpay) for examples.

```typescript
import { registerProcessor, type PaymentProcessor } from '@payloops/processor-core';

class NewProcessor implements PaymentProcessor {
  name = 'newprocessor';
  // ... implement methods
}

export function register() {
  registerProcessor(new NewProcessor());
}

register();
```

## Docker

```bash
# Build image
docker build -t payloops/processor-core .

# Run worker
docker run payloops/processor-core
```

## License

Proprietary - PayLoops
