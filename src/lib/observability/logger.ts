import pino from 'pino';
import { trace } from '@opentelemetry/api';

const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'loop-processor-core';

const traceMixin = () => {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const spanContext = span.spanContext();
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId
  };
};

export const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  mixin: traceMixin,
  base: {
    service: SERVICE_NAME,
    env: NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
});

export function createActivityLogger(activityName: string, correlationId?: string) {
  return logger.child({
    activity: activityName,
    correlationId
  });
}

export function createWorkflowLogger(workflowId: string, correlationId?: string) {
  return logger.child({
    workflowId,
    correlationId
  });
}
