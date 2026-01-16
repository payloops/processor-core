# PayLoops Processor Core

The **processor-core** service is the workflow engine powering PayLoops. It orchestrates payment processing, handles retries, manages state transitions, and ensures reliable webhook delivery—all with durability guarantees from [Temporal](https://temporal.io).

## Role in the Platform

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                           Backend API                                   │
│                               │                                         │
│                               │ Triggers workflows                      │
│                               ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │               ★ PROCESSOR-CORE (this repo) ★                     │  │
│   │                                                                  │  │
│   │  ┌──────────────────────────────────────────────────────────┐   │  │
│   │  │                   Temporal Workers                        │   │  │
│   │  │                                                           │   │  │
│   │  │  PaymentWorkflow    RefundWorkflow    WebhookWorkflow    │   │  │
│   │  │       │                   │                  │            │   │  │
│   │  │       ▼                   ▼                  ▼            │   │  │
│   │  │  ┌─────────┐        ┌─────────┐        ┌─────────┐       │   │  │
│   │  │  │Activities│        │Activities│        │Activities│       │   │  │
│   │  │  └─────────┘        └─────────┘        └─────────┘       │   │  │
│   │  └──────────────────────────────────────────────────────────┘   │  │
│   │                               │                                  │  │
│   └───────────────────────────────┼──────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│              ┌────────────────────────────────────────┐                │
│              │         Payment Processors             │                │
│              │   processor-stripe  processor-razorpay │                │
│              └────────────────────────────────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why Temporal?

Payment processing requires **durability** and **reliability**:

- If the server crashes mid-payment, the workflow resumes exactly where it left off
- Long-running operations (like waiting for 3DS) don't block resources
- Automatic retries with configurable backoff
- Full audit trail of every state transition
- Easy to add timeouts, deadlines, and cancellation

## Workflows

### PaymentWorkflow

Handles the complete lifecycle of a payment from order creation to completion.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ pending │───▶│ routing │───▶│charging │───▶│ 3DS/SCA │───▶│completed│
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                  │
                                                  ▼
                                           Wait for signal
                                           (threeDSComplete)
```

**States:**
- `pending` - Order created, awaiting payment
- `processing` - Routing to optimal processor
- `authorized` - Payment authorized, awaiting capture
- `requires_action` - Waiting for 3DS/SCA verification
- `captured` - Payment successfully captured
- `failed` - Payment failed

**Signals:**
- `threeDSComplete` - Customer completed 3DS challenge

### WebhookDeliveryWorkflow

Ensures merchants receive webhook notifications reliably.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ attempt │───▶│  retry  │───▶│  retry  │───▶│  final  │
│   #1    │    │   #2    │    │   #3    │    │ status  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
    1min          5min           30min
```

**Retry Schedule:**
1. Immediate
2. 1 minute
3. 5 minutes
4. 30 minutes
5. 2 hours
6. 24 hours (final attempt)

## Processor Registry

The core provides a plugin system for payment processors:

```typescript
// In processor-stripe or processor-razorpay
import { registerProcessor, PaymentProcessor } from '@payloops/processor-core';

class StripeProcessor implements PaymentProcessor {
  name = 'stripe';

  async createPayment(input, config) { /* ... */ }
  async capturePayment(orderId, amount, config) { /* ... */ }
  async refundPayment(transactionId, amount, config) { /* ... */ }
  async getPaymentStatus(orderId, config) { /* ... */ }
}

registerProcessor(new StripeProcessor());
```

Workflows dynamically load the appropriate processor based on routing rules.

## Activities

Activities are the building blocks that workflows orchestrate:

| Activity | Description |
|----------|-------------|
| `getOrder` | Fetch order details from database |
| `updateOrderStatus` | Update order status in database |
| `getProcessorConfig` | Get decrypted processor credentials |
| `routePayment` | Determine which processor to use |
| `processPayment` | Execute payment via processor |
| `deliverWebhook` | POST webhook to merchant endpoint |

## Development

### Prerequisites

- Node.js 22+
- pnpm
- Temporal server (via Docker)
- PostgreSQL (via Docker)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start Temporal (from root loop repo)
docker-compose up -d temporal

# Start worker in development mode
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start worker with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Run production worker |
| `pnpm typecheck` | Run TypeScript compiler |
| `pnpm lint` | Run ESLint |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TEMPORAL_ADDRESS` | Yes | Temporal server (default: localhost:7233) |
| `TEMPORAL_NAMESPACE` | Yes | Temporal namespace |
| `ENCRYPTION_KEY` | Yes | Key to decrypt processor credentials |

## Adding a New Processor

1. Create a new repository (e.g., `processor-paypal`)
2. Implement the `PaymentProcessor` interface
3. Call `registerProcessor()` on module load
4. Import the processor in this repo's worker

See [processor-stripe](https://github.com/payloops/processor-stripe) for a complete example.

## Monitoring

### Temporal UI

Access at `http://localhost:8080` to:
- View running and completed workflows
- Inspect workflow history and state
- Manually trigger signals
- Terminate stuck workflows

### Workflow IDs

Workflows use predictable IDs for easy lookup:
- Payment: `payment-{orderId}`
- Webhook: `webhook-{eventId}`

## Related Repositories

- [backend](https://github.com/payloops/backend) - Triggers workflows via Temporal client
- [processor-stripe](https://github.com/payloops/processor-stripe) - Stripe processor implementation
- [processor-razorpay](https://github.com/payloops/processor-razorpay) - Razorpay processor implementation

## License

Copyright © 2025 PayLoops. All rights reserved.
