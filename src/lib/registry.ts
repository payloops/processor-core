import type { PaymentProcessor, ProcessorRegistry } from '../types';

// Global processor registry
const processors: ProcessorRegistry = new Map();

export function registerProcessor(processor: PaymentProcessor): void {
  if (processors.has(processor.name)) {
    throw new Error(`Processor ${processor.name} is already registered`);
  }
  processors.set(processor.name, processor);
  console.log(`Registered processor: ${processor.name}`);
}

export function getProcessor(name: string): PaymentProcessor {
  const processor = processors.get(name);
  if (!processor) {
    throw new Error(`Processor ${name} not found. Available: ${Array.from(processors.keys()).join(', ')}`);
  }
  return processor;
}

export function getRegisteredProcessors(): string[] {
  return Array.from(processors.keys());
}

export function hasProcessor(name: string): boolean {
  return processors.has(name);
}
