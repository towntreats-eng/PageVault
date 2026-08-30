import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let connection: Redis | null = null;
let testQueue: Queue | null = null;
let testWorker: Worker | null = null;

try {
  connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  testQueue = new Queue("test-queue", { connection });

  testWorker = new Worker(
    "test-queue",
    async (job) => {
      console.log(`[BullMQ] Executing test job ${job.id} at ${new Date().toISOString()}`, job.data);
      return { status: "success", timestamp: new Date().toISOString() };
    },
    { connection }
  );

  testWorker.on("completed", (job) => {
    console.log(`[BullMQ] Job ${job.id} completed successfully`);
  });

  testWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed:`, err);
  });
} catch (error) {
  console.warn("[BullMQ] Redis unavailable, fallback execution enabled:", error);
}

export async function enqueueTestJob(payload: Record<string, any>) {
  if (testQueue) {
    try {
      const job = await testQueue.add("test-task", payload);
      return { queued: true, jobId: job.id, timestamp: new Date().toISOString() };
    } catch (err) {
      console.warn("[BullMQ] Queue add fallback:", err);
    }
  }
  
  // Fallback in-memory log
  console.log(`[Queue Fallback] Processed task at ${new Date().toISOString()}:`, payload);
  return { queued: false, fallback: true, timestamp: new Date().toISOString() };
}

export { testQueue, testWorker };
