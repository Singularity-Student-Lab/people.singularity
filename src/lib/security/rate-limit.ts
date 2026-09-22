import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

interface InMemEntry {
  timestamps: number[];
}

// In-memory fallback for local development or when Redis is not yet provisioned
const inMemoryStore = new Map<string, InMemEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (entry.timestamps.length === 0) {
        inMemoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// Check for Upstash or Vercel KV credentials
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const isRedisConfigured = Boolean(redisUrl && redisToken);

let redis: Redis | null = null;
if (isRedisConfigured) {
  try {
    redis = new Redis({
      url: redisUrl!,
      token: redisToken!,
    });
  } catch (err) {
    console.error('Failed to initialize Upstash Redis client:', err);
  }
}

// Cache Ratelimit instances by limit and window duration
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(maxAttempts: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${maxAttempts}:${windowSeconds}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s`),
      analytics: false,
      prefix: 'singularity:ratelimit',
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Distributed sliding-window rate limiter powered by Upstash Redis (with dev in-memory fallback).
 *
 * @param key unique identifier (e.g. `login:ip:127.0.0.1` or `login:user:jane.doe`)
 * @param maxAttempts maximum requests permitted within window
 * @param windowMs window duration in milliseconds (default 15 minutes)
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));

  // If Redis is configured, use durable distributed rate limiting
  if (redis) {
    try {
      const limiter = getUpstashLimiter(maxAttempts, windowSeconds);
      if (limiter) {
        const { success, remaining, reset } = await limiter.limit(key);
        const resetSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return {
          allowed: success,
          remaining,
          resetSeconds,
        };
      }
    } catch (err) {
      console.error('Upstash rate limit check failed, falling back to in-memory:', err);
    }
  }

  // Fallback: in-memory sliding window
  const now = Date.now();
  let entry = inMemoryStore.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    inMemoryStore.set(key, entry);
  }

  // Remove timestamps older than windowMs
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    const oldest = entry.timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(resetSeconds, 1),
    };
  }

  // Record this attempt
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxAttempts - entry.timestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Resets the rate limit counter for a key upon successful action (e.g. successful login).
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (redis) {
    try {
      // Clear key from Redis directly
      await redis.del(`singularity:ratelimit:${key}`);
      for (const limiter of limiterCache.values()) {
        await limiter.resetUsedTokens(key);
      }
    } catch (err) {
      console.error('Failed to reset Upstash rate limit key:', err);
    }
  }

  inMemoryStore.delete(key);
}
