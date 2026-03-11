/**
 * Rate Limiting Module
 * Implements exponential backoff, retry queues, and request throttling
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  message?: string; // Error message
  statusCode?: number; // HTTP status code
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Retry queue entry
 */
export interface RetryQueueEntry<T> {
  id: string;
  data: T;
  retries: number;
  nextRetryTime: number;
  createdAt: number;
  lastAttemptAt?: number;
}

/**
 * In-memory rate limiter store
 */
class RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if a request is allowed
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    // If no entry exists or window has expired, allow the request
    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    // Check if limit is exceeded
    if (entry.count >= config.maxRequests) {
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string): number | null {
    const entry = this.store.get(key);
    return entry ? entry.resetTime : null;
  }

  /**
   * Reset a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Retry queue for failed operations
 */
export class RetryQueue<T> {
  private queue: Map<string, RetryQueueEntry<T>> = new Map();
  private config: RetryConfig;
  private processInterval: NodeJS.Timeout | null = null;
  private handler?: (entry: RetryQueueEntry<T>) => Promise<boolean>;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Add an item to the retry queue
   */
  add(id: string, data: T): void {
    const entry: RetryQueueEntry<T> = {
      id,
      data,
      retries: 0,
      nextRetryTime: Date.now(),
      createdAt: Date.now(),
    };

    this.queue.set(id, entry);
  }

  /**
   * Set the handler for processing queue items
   */
  setHandler(handler: (entry: RetryQueueEntry<T>) => Promise<boolean>): void {
    this.handler = handler;
  }

  /**
   * Start processing the queue
   */
  start(intervalMs: number = 1000): void {
    if (this.processInterval) {
      return; // Already running
    }

    this.processInterval = setInterval(() => {
      this.process();
    }, intervalMs);
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Process queue items that are ready for retry
   */
  private async process(): Promise<void> {
    if (!this.handler) {
      return;
    }

    const now = Date.now();
    const entriesToProcess: RetryQueueEntry<T>[] = [];

    // Find entries ready for retry
    const entries = Array.from(this.queue.values());
    for (const entry of entries) {
      if (now >= entry.nextRetryTime) {
        entriesToProcess.push(entry);
      }
    }

    // Process entries
    for (const entry of entriesToProcess) {
      try {
        const success = await this.handler(entry);

        if (success) {
          // Remove from queue on success
          this.queue.delete(entry.id);
        } else {
          // Schedule next retry with exponential backoff
          this.scheduleRetry(entry);
        }
      } catch (error) {
        console.error(`Error processing retry queue entry ${entry.id}:`, error);
        this.scheduleRetry(entry);
      }
    }
  }

  /**
   * Schedule the next retry with exponential backoff
   */
  private scheduleRetry(entry: RetryQueueEntry<T>): void {
    if (entry.retries >= this.config.maxRetries) {
      // Max retries exceeded, remove from queue
      console.error(
        `Max retries exceeded for entry ${entry.id}. Removing from queue.`
      );
      this.queue.delete(entry.id);
      return;
    }

    entry.retries++;
    entry.lastAttemptAt = Date.now();

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialDelayMs *
        Math.pow(this.config.backoffMultiplier, entry.retries - 1),
      this.config.maxDelayMs
    );

    entry.nextRetryTime = Date.now() + delay;
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.size;
  }

  /**
   * Get an entry from the queue
   */
  getEntry(id: string): RetryQueueEntry<T> | undefined {
    return this.queue.get(id);
  }

  /**
   * Remove an entry from the queue
   */
  remove(id: string): void {
    this.queue.delete(id);
  }

  /**
   * Get all entries in the queue
   */
  getAll(): RetryQueueEntry<T>[] {
    return Array.from(this.queue.values());
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.clear();
  }
}

/**
 * Global rate limiter store
 */
const rateLimiterStore = new RateLimiterStore();

/**
 * Create a rate limiter for a specific key
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    /**
     * Check if a request is allowed
     */
    isAllowed(key: string): boolean {
      return rateLimiterStore.isAllowed(key, config);
    },

    /**
     * Get remaining requests
     */
    getRemaining(key: string): number {
      return rateLimiterStore.getRemaining(key, config);
    },

    /**
     * Get reset time
     */
    getResetTime(key: string): number | null {
      return rateLimiterStore.getResetTime(key);
    },

    /**
     * Reset a key
     */
    reset(key: string): void {
      rateLimiterStore.reset(key);
    },

    /**
     * Clear all entries
     */
    clear(): void {
      rateLimiterStore.clear();
    },
  };
}

/**
 * WhatsApp message rate limiter (10 messages per second per phone number)
 */
export const whatsappRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000, // 1 second
  message: "Too many WhatsApp messages. Please try again later.",
  statusCode: 429,
});

/**
 * User request rate limiter (100 requests per minute per user)
 */
export const userRequestRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  message: "Too many requests. Please try again later.",
  statusCode: 429,
});

/**
 * IP-based rate limiter (1000 requests per hour per IP)
 */
export const ipRateLimiter = createRateLimiter({
  maxRequests: 1000,
  windowMs: 3600000, // 1 hour
  message: "Too many requests from this IP. Please try again later.",
  statusCode: 429,
});

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  multiplier: number = 2
): number {
  const delay = initialDelayMs * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt <= config.maxRetries) {
        const delay = calculateBackoffDelay(
          attempt,
          config.initialDelayMs,
          config.maxDelayMs
        );

        console.warn(
          `Attempt ${attempt} failed. Retrying in ${delay}ms...`,
          error
        );

        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`
  );
}
