/**
 * Temporal Worker Interceptors with OpenTelemetry trace context propagation
 *
 * This module provides interceptors that:
 * 1. Propagate trace context from workflow headers to activity spans
 * 2. Add structured logging with trace context
 * 3. Create proper parent-child span relationships
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  OpenTelemetryActivityInboundInterceptor,
} from '@temporalio/interceptors-opentelemetry';
import type { Context as ActivityContext } from '@temporalio/activity';
import type {
  ActivityInboundCallsInterceptor,
  ActivityExecuteInput,
  Next,
} from '@temporalio/worker';
import { logger } from '@payloops/observability';

export interface WorkerInterceptorsConfig {
  /** Service/processor name for logging */
  serviceName: string;
}

/**
 * Creates an activity interceptor that combines OpenTelemetry tracing with structured logging
 *
 * Uses Temporal's OpenTelemetryActivityInboundInterceptor for trace propagation,
 * and wraps it with additional structured logging that includes trace IDs.
 */
class TracingActivityInterceptor implements ActivityInboundCallsInterceptor {
  private readonly otelInterceptor: OpenTelemetryActivityInboundInterceptor;
  private readonly config: WorkerInterceptorsConfig;
  private readonly ctx: ActivityContext;

  constructor(ctx: ActivityContext, config: WorkerInterceptorsConfig) {
    this.ctx = ctx;
    this.config = config;
    // Use Temporal's built-in OTel interceptor for proper trace context propagation
    this.otelInterceptor = new OpenTelemetryActivityInboundInterceptor(ctx);
  }

  async execute(
    input: ActivityExecuteInput,
    next: Next<ActivityInboundCallsInterceptor, 'execute'>
  ): Promise<unknown> {
    const activityType = this.ctx.info.activityType;
    const workflowId = this.ctx.info.workflowExecution.workflowId;
    const startTime = Date.now();

    // Get current span for trace context (will be set properly after OTel interceptor runs)
    const currentSpan = trace.getActiveSpan();
    const spanContext = currentSpan?.spanContext();

    logger.info(
      {
        activity: activityType,
        workflowId,
        processor: this.config.serviceName,
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId,
      },
      'Activity started'
    );

    try {
      // Delegate to Temporal's OTel interceptor which handles trace context propagation
      const result = await this.otelInterceptor.execute(input, next);

      // Get span context again after OTel interceptor has set it up
      const finalSpan = trace.getActiveSpan();
      const finalSpanContext = finalSpan?.spanContext();

      logger.info(
        {
          activity: activityType,
          workflowId,
          duration: Date.now() - startTime,
          trace_id: finalSpanContext?.traceId ?? spanContext?.traceId,
          span_id: finalSpanContext?.spanId ?? spanContext?.spanId,
        },
        'Activity completed'
      );

      return result;
    } catch (error) {
      const finalSpan = trace.getActiveSpan();
      const finalSpanContext = finalSpan?.spanContext();

      logger.error(
        {
          activity: activityType,
          workflowId,
          error,
          duration: Date.now() - startTime,
          trace_id: finalSpanContext?.traceId ?? spanContext?.traceId,
          span_id: finalSpanContext?.spanId ?? spanContext?.spanId,
        },
        'Activity failed'
      );

      throw error;
    }
  }
}

/**
 * Creates worker interceptors configuration with OpenTelemetry trace propagation
 *
 * @example
 * ```typescript
 * import { createWorkerInterceptors } from '@payloops/processor-core/observability';
 *
 * const worker = await Worker.create({
 *   // ... other config
 *   interceptors: createWorkerInterceptors({ serviceName: 'stripe-processor' }),
 * });
 * ```
 */
export function createWorkerInterceptors(config: WorkerInterceptorsConfig) {
  return {
    activityInbound: [
      (ctx: ActivityContext) => new TracingActivityInterceptor(ctx, config),
    ],
  };
}
