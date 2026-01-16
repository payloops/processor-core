import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  uuid
} from 'drizzle-orm/pg-core';

// Schema definitions (shared with backend)
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull(),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  processor: varchar('processor', { length: 50 }),
  processorOrderId: varchar('processor_order_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  workflowId: varchar('workflow_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  processorTransactionId: varchar('processor_transaction_id', { length: 255 }),
  processorResponse: jsonb('processor_response'),
  errorCode: varchar('error_code', { length: 100 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const processorConfigs = pgTable('processor_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull(),
  processor: varchar('processor', { length: 50 }).notNull(),
  credentialsEncrypted: text('credentials_encrypted').notNull(),
  priority: integer('priority').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  testMode: boolean('test_mode').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull(),
  orderId: uuid('order_id'),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  nextRetryAt: timestamp('next_retry_at'),
  deliveredAt: timestamp('delivered_at'),
  workflowId: varchar('workflow_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret')
});

// Database connection
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    dbInstance = drizzle(pool);
  }
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
