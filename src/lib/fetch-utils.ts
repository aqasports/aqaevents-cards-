/**
 * Utility for fetching API resources with automatic retries and exponential backoff.
 * Prevents intermittent 5xx serverless cold-start and DB timeout errors from failing client requests.
 */

export interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: FetchWithRetryOptions
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 300,
    timeoutMs = 15000,
    ...fetchOptions
  } = init || {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...fetchOptions,
        signal: fetchOptions.signal || controller.signal,
      });

      clearTimeout(timer);

      // Retry on server errors (500, 502, 503, 504) if retry attempts remain
      if (!response.ok && response.status >= 500 && attempt < retries) {
        const backoff = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries) {
        const backoff = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new Error("Failed to fetch resource after retries.");
}
