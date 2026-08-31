import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

/**
 * Job queues.
 *
 * Two execution modes, and callers are always told which one they got:
 *   - Redis available  -> real BullMQ queue, survives a process restart.
 *   - Redis missing    -> in-process setTimeout fallback, does NOT survive a restart.
 *
 * enqueue() returns `scheduled: false` when neither path could take the job.
 * Never tell a merchant "we will retry" unless scheduled === true.
 */

export type QueueName = "crawl" | "verify" | "reverify" | "test-queue";

type JobHandler = (data: any) => Promise<any>;

const REDIS_URL = process.env.REDIS_URL || "";

const handlers = new Map<QueueName, JobHandler>();
const queues = new Map<QueueName, Queue>();
const workers = new Map<QueueName, Worker>();

let connection: Redis | null = null;
let redisUsable = false;

if (REDIS_URL) {
  try {
    connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    connection.on("error", (err) => {
      if (redisUsable) console.warn("[queue] redis error, falling back in-process:", err.message);
      redisUsable = false;
    });
    connection.on("ready", () => {
      redisUsable = true;
    });
    connection.connect().catch((err) => {
      console.warn("[queue] redis unreachable, in-process fallback active:", err.message);
      redisUsable = false;
    });
  } catch (err) {
    console.warn("[queue] redis init failed, in-process fallback active:", err);
    connection = null;
  }
}

function getQueue(name: QueueName): Queue | null {
  if (!connection || !redisUsable) return null;
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection });
    queues.set(name, q);
  }
  return q;
}

function ensureWorker(name: QueueName) {
  if (!connection || workers.has(name)) return;
  const worker = new Worker(
    name,
    async (job) => {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`No handler registered for queue "${name}"`);
      return handler(job.data);
    },
    { connection, concurrency: name === "crawl" ? 1 : 3 }
  );
  worker.on("failed", (job, err) => {
    console.error(`[queue:${name}] job ${job?.id} failed:`, err?.message);
  });
  workers.set(name, worker);
}

/** Register the function that processes a queue. Call this from the module that owns the work. */
export function registerHandler(name: QueueName, handler: JobHandler) {
  handlers.set(name, handler);
  ensureWorker(name);
}

export interface EnqueueResult {
  /** true only if the job will actually run later. Gate all "retry scheduled" copy on this. */
  scheduled: boolean;
  /** true = durable BullMQ job. false = in-process timer, lost on restart. */
  durable: boolean;
  jobId?: string;
  runsAt: string | null;
}

export async function enqueue(
  name: QueueName,
  data: Record<string, any>,
  opts: { delayMs?: number; attempts?: number } = {}
): Promise<EnqueueResult> {
  const delayMs = opts.delayMs ?? 0;
  const runsAt = new Date(Date.now() + delayMs).toISOString();

  const queue = getQueue(name);
  if (queue) {
    try {
      const job = await queue.add(name, data, {
        delay: delayMs,
        attempts: opts.attempts ?? 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      });
      return { scheduled: true, durable: true, jobId: job.id, runsAt };
    } catch (err) {
      console.warn(`[queue:${name}] add failed, trying in-process fallback:`, err);
    }
  }

  const handler = handlers.get(name);
  if (!handler) {
    console.error(`[queue:${name}] dropped job — no redis and no handler registered`);
    return { scheduled: false, durable: false, runsAt: null };
  }

  setTimeout(() => {
    handler(data).catch((err) => console.error(`[queue:${name}] in-process job failed:`, err));
  }, delayMs).unref?.();

  return { scheduled: true, durable: false, runsAt };
}

/** Kept for the Phase 0 proof that jobs run at all. */
export async function enqueueTestJob(payload: Record<string, any>) {
  registerHandler("test-queue", async (data) => {
    console.log(`[queue:test-queue] executed at ${new Date().toISOString()}`, data);
    return { status: "success" };
  });
  const result = await enqueue("test-queue", payload);
  return { ...result, timestamp: new Date().toISOString() };
}

export function queueHealth() {
  return {
    redisConfigured: Boolean(REDIS_URL),
    redisConnected: redisUsable,
    mode: redisUsable ? "durable" : "in-process-fallback",
    registeredHandlers: Array.from(handlers.keys()),
  };
}
