/**
 * WebSocket per-socket rate limiter (spec §13.5).
 *
 * Limits the number of events a single socket can emit per second/minute.
 * Prevents event flooding and abuse.
 *
 * Spec ref: §13.5 (rate limiting per socket, throttling for high-frequency events),
 *           §22.3 (rate limiting per socket).
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis.service';
import type { Socket } from 'socket.io';

@Injectable()
export class WsRateLimiter {
  private readonly logger = new Logger(WsRateLimiter.name);
  private static readonly MAX_EVENTS_PER_SECOND = 20;
  private static readonly MAX_EVENTS_PER_MINUTE = 200;

  // In-memory sliding window (per socket)
  private readonly eventCounts = new Map<string, { second: number[]; minute: number[] }>();

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if a socket is allowed to emit an event.
   * Returns true if allowed, false if rate limited.
   */
  isAllowed(socket: Socket): boolean {
    const socketId = socket.id;
    const now = Date.now();

    let counts = this.eventCounts.get(socketId);
    if (!counts) {
      counts = { second: [], minute: [] };
      this.eventCounts.set(socketId, counts);
    }

    // Clean old entries
    counts.second = counts.second.filter((t) => now - t < 1000);
    counts.minute = counts.minute.filter((t) => now - t < 60000);

    // Check rate limits
    if (counts.second.length >= WsRateLimiter.MAX_EVENTS_PER_SECOND) {
      this.logger.warn(`WS rate limit (per-second) exceeded: socket=${socketId}`);
      return false;
    }
    if (counts.minute.length >= WsRateLimiter.MAX_EVENTS_PER_MINUTE) {
      this.logger.warn(`WS rate limit (per-minute) exceeded: socket=${socketId}`);
      return false;
    }

    // Record the event
    counts.second.push(now);
    counts.minute.push(now);

    return true;
  }

  /**
   * Clean up rate limit data for a disconnected socket.
   */
  cleanup(socketId: string): void {
    this.eventCounts.delete(socketId);
  }
}
