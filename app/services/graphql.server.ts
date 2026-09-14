/**
 * Resilient Shopify GraphQL Client
 * Handles Shopify rate limits, leaky bucket throttle monitoring, and exponential backoff.
 */

export interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: ThrottleStatus;
    };
  };
}

export async function executeGraphQL<T = any>(
  admin: { graphql: (query: string, options?: { variables?: Record<string, any> }) => Promise<Response> },
  query: string,
  variables?: Record<string, any>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await admin.graphql(query, { variables });

      if (response.status === 429) {
        // Leaky bucket overflowed, wait and retry
        const retryAfter = parseFloat(response.headers.get("Retry-After") || "2.0");
        const backoffMs = Math.max(retryAfter * 1000, 1000 * Math.pow(2, attempt));
        console.warn(`[GraphQL Throttle 429] Waiting ${backoffMs}ms before attempt ${attempt}/${maxRetries}`);
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify GraphQL HTTP error (${response.status}): ${errorText}`);
      }

      const json: GraphQLResponse<T> = await response.json();

      // Check throttle status in extensions to avoid upcoming 429s
      const throttle = json.extensions?.cost?.throttleStatus;
      if (throttle && throttle.currentlyAvailable < 150) {
        const sleepMs = Math.ceil((200 - throttle.currentlyAvailable) / (throttle.restoreRate || 50)) * 1000;
        console.log(`[GraphQL Throttle Buffer] Available points low (${throttle.currentlyAvailable}). Pausing ${sleepMs}ms`);
        await new Promise((res) => setTimeout(res, Math.min(sleepMs, 3000)));
      }

      if (json.errors && json.errors.length > 0) {
        const msg = json.errors.map((e) => e.message).join("; ");
        throw new Error(`Shopify GraphQL execution error: ${msg}`);
      }

      if (!json.data) {
        throw new Error("Shopify GraphQL returned empty data payload.");
      }

      return json.data;
    } catch (err: any) {
      if (attempt >= maxRetries) {
        console.error(`[GraphQL Final Failure] Attempt ${attempt} failed:`, err);
        throw err;
      }
      const backoffMs = 500 * Math.pow(2, attempt);
      console.warn(`[GraphQL Error] Attempt ${attempt} failed with "${err.message}". Retrying in ${backoffMs}ms...`);
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }

  throw new Error(`Failed to execute Shopify GraphQL query after ${maxRetries} attempts.`);
}
