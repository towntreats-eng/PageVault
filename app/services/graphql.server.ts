/**
 * Centralized GraphQL Client for Shopify Admin API
 * Enforces cost-based leaky bucket throttle monitoring & exponential backoff on THROTTLED errors
 * See 03-ARCHITECTURE.md §8
 */

export interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

export async function executeShopifyGraphQL(
  admin: any,
  query: string,
  variables: Record<string, any> = {},
  maxRetries = 5
) {
  let attempt = 0;
  let delayMs = 500;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await admin.graphql(query, { variables });
      const json = await response.json();

      // Inspect extensions for throttleStatus
      const extensions = json?.extensions;
      if (extensions?.cost?.throttleStatus) {
        const throttle: ThrottleStatus = extensions.cost.throttleStatus;
        console.log(
          `[GraphQL ThrottleStatus] Available: ${throttle.currentlyAvailable}/${throttle.maximumAvailable} (Restore: ${throttle.restoreRate}/s)`
        );

        // If available points drop below 100, pause briefly to refill bucket
        if (throttle.currentlyAvailable < 100) {
          const waitTime = Math.ceil((100 - throttle.currentlyAvailable) / throttle.restoreRate) * 1000;
          console.warn(`[GraphQL Throttle Warning] Low bucket capacity. Pausing for ${waitTime}ms...`);
          await new Promise((res) => setTimeout(res, waitTime));
        }
      }

      // Handle THROTTLED errors
      if (json?.errors?.some((e: any) => e.extensions?.code === "THROTTLED")) {
        console.warn(`[GraphQL THROTTLED] Attempt ${attempt}/${maxRetries}. Retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs *= 2; // Exponential backoff
        continue;
      }

      return json;
    } catch (err: any) {
      if (attempt >= maxRetries) throw err;
      console.warn(`[GraphQL Client Error] Attempt ${attempt}/${maxRetries}:`, err?.message || err);
      await new Promise((res) => setTimeout(res, delayMs));
      delayMs *= 2;
    }
  }

  throw new Error("Max GraphQL query retries exceeded due to rate limiting.");
}
