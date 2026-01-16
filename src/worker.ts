import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'loop',
    taskQueue: 'payment-queue',
    workflowsPath: new URL('./workflows/index.js', import.meta.url).pathname,
    activities
  });

  console.log('Starting Temporal worker on payment-queue...');

  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
