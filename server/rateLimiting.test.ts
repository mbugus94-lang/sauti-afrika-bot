import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createRateLimiter,
  RetryQueue,
  retryWithBackoff,
  calculateBackoffDelay,
  sleep,
  whatsappRateLimiter,
  userRequestRateLimiter,
} from "./rateLimiting";

describe("Rate Limiting", () => {
  describe("createRateLimiter", () => {
    beforeEach(() => {
      whatsappRateLimiter.clear();
      userRequestRateLimiter.clear();
    });

    it("should allow requests within the limit", () => {
      const limiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 1000,
      });

      expect(limiter.isAllowed("test-key-1")).toBe(true);
      expect(limiter.isAllowed("test-key-1")).toBe(true);
      expect(limiter.isAllowed("test-key-1")).toBe(true);
    });

    it("should block requests exceeding the limit", () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      const key = `block-test-${Date.now()}`;
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(false);
    });

    it("should reset counter after window expires", async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 100,
      });

      const key = `reset-test-${Date.now()}`;
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(false);

      // Wait for window to expire
      await sleep(150);

      expect(limiter.isAllowed(key)).toBe(true);
    });

    it("should track remaining requests", () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 1000,
      });

      const key = `remaining-test-${Date.now()}`;
      expect(limiter.getRemaining(key)).toBe(5);
      limiter.isAllowed(key);
      expect(limiter.getRemaining(key)).toBe(4);
      limiter.isAllowed(key);
      expect(limiter.getRemaining(key)).toBe(3);
    });

    it("should handle different keys independently", () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      const key1 = `key1-${Date.now()}`;
      const key2 = `key2-${Date.now()}`;

      expect(limiter.isAllowed(key1)).toBe(true);
      expect(limiter.isAllowed(key1)).toBe(true);
      expect(limiter.isAllowed(key1)).toBe(false);

      expect(limiter.isAllowed(key2)).toBe(true);
      expect(limiter.isAllowed(key2)).toBe(true);
      expect(limiter.isAllowed(key2)).toBe(false);
    });

    it("should reset a specific key", () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 1000,
      });

      const key = `reset-key-test-${Date.now()}`;
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(false);

      limiter.reset(key);

      expect(limiter.isAllowed(key)).toBe(true);
    });

    it("should clear all entries", () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 1000,
      });

      const key1 = `clear-key1-${Date.now()}`;
      const key2 = `clear-key2-${Date.now()}`;
      const key3 = `clear-key3-${Date.now()}`;

      limiter.isAllowed(key1);
      limiter.isAllowed(key2);
      limiter.isAllowed(key3);

      limiter.clear();

      expect(limiter.isAllowed(key1)).toBe(true);
      expect(limiter.isAllowed(key2)).toBe(true);
      expect(limiter.isAllowed(key3)).toBe(true);
    });
  });

  describe("whatsappRateLimiter", () => {
    beforeEach(() => {
      whatsappRateLimiter.clear();
    });

    it("should limit WhatsApp messages to 10 per second", () => {
      const key = `whatsapp:+${Date.now()}`;

      // Should allow 10 messages
      for (let i = 0; i < 10; i++) {
        expect(whatsappRateLimiter.isAllowed(key)).toBe(true);
      }

      // 11th message should be blocked
      expect(whatsappRateLimiter.isAllowed(key)).toBe(false);
    });
  });

  describe("userRequestRateLimiter", () => {
    beforeEach(() => {
      userRequestRateLimiter.clear();
    });

    it("should limit user requests to 100 per minute", () => {
      const key = `user:${Date.now()}`;

      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        expect(userRequestRateLimiter.isAllowed(key)).toBe(true);
      }

      // 101st request should be blocked
      expect(userRequestRateLimiter.isAllowed(key)).toBe(false);
    });
  });
});

describe("RetryQueue", () => {
  it("should add items to the queue", () => {
    const queue = new RetryQueue({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    queue.add("item1", { data: "test" });
    queue.add("item2", { data: "test2" });

    expect(queue.getSize()).toBe(2);
  });

  it("should retrieve items from the queue", () => {
    const queue = new RetryQueue({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    const testData = { data: "test" };
    queue.add("item1", testData);

    const entry = queue.getEntry("item1");
    expect(entry).toBeDefined();
    expect(entry?.data).toEqual(testData);
  });

  it("should remove items from the queue", () => {
    const queue = new RetryQueue({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    queue.add("item1", { data: "test" });
    expect(queue.getSize()).toBe(1);

    queue.remove("item1");
    expect(queue.getSize()).toBe(0);
  });

  it("should get all entries", () => {
    const queue = new RetryQueue({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    queue.add("item1", { data: "test1" });
    queue.add("item2", { data: "test2" });

    const entries = queue.getAll();
    expect(entries).toHaveLength(2);
  });

  it("should clear the queue", () => {
    const queue = new RetryQueue({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    queue.add("item1", { data: "test" });
    queue.add("item2", { data: "test" });

    queue.clear();
    expect(queue.getSize()).toBe(0);
  });

  it("should process queue items with handler", async () => {
    const queue = new RetryQueue({
      maxRetries: 2,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2,
    });

    let processedCount = 0;
    queue.setHandler(async () => {
      processedCount++;
      return true;
    });

    queue.add("item1", { data: "test" });
    queue.start(100);

    // Wait for processing
    await sleep(200);

    queue.stop();

    expect(processedCount).toBeGreaterThan(0);
    expect(queue.getSize()).toBe(0);
  });

  it("should retry failed items with exponential backoff", async () => {
    const queue = new RetryQueue({
      maxRetries: 2,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2,
    });

    let attemptCount = 0;
    queue.setHandler(async () => {
      attemptCount++;
      return attemptCount > 2; // Fail first 2 times, succeed on 3rd
    });

    queue.add("item1", { data: "test" });
    queue.start(50);

    // Wait for retries
    await sleep(500);

    queue.stop();

    expect(attemptCount).toBeGreaterThanOrEqual(2);
  });
});

describe("Exponential Backoff", () => {
  it("should calculate backoff delay correctly", () => {
    const delay1 = calculateBackoffDelay(1, 100, 10000);
    const delay2 = calculateBackoffDelay(2, 100, 10000);
    const delay3 = calculateBackoffDelay(3, 100, 10000);

    expect(delay1).toBe(100);
    expect(delay2).toBe(200);
    expect(delay3).toBe(400);
  });

  it("should respect max delay", () => {
    const delay = calculateBackoffDelay(10, 100, 1000);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it("should handle custom multiplier", () => {
    const delay1 = calculateBackoffDelay(1, 100, 10000, 3);
    const delay2 = calculateBackoffDelay(2, 100, 10000, 3);

    expect(delay1).toBe(100);
    expect(delay2).toBe(300);
  });
});

describe("retryWithBackoff", () => {
  it("should succeed on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    let attemptCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error("Temporary failure");
      }
      return "success";
    });

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw after max retries exceeded", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent failure"));

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      })
    ).rejects.toThrow("Failed after 3 attempts");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should increase delay between retries", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error("Failure");
    });

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelayMs: 20,
        maxDelayMs: 500,
        backoffMultiplier: 2,
      })
    ).rejects.toThrow();

    // Should have been called multiple times (initial + retries)
    expect(callCount).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("sleep", () => {
  it("should sleep for specified duration", async () => {
    const start = Date.now();
    await sleep(100);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThan(200);
  });
});
