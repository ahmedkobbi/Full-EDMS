/**
 * Presence service — tracks which users are currently viewing/editing documents
 * and broadcasts presence updates via WebSocket (spec §13.4 — presence.updated).
 *
 * Also provides the Crisis Room feature (spec §9.11) — a specialized
 * synchronized room for incident response where multiple cleared users
 * can see real-time redactions, annotations, and document links.
 *
 * Presence is stored in Redis (per-document sorted set with timestamp),
 * with a 60-second TTL. Users must re-announce every 30 seconds to stay
 * "present" on a document.
 *
 * Spec ref: §9.11 (Crisis Response Room), §13.4 (presence.updated, crisisRoom.sync).
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis.service.js';

export interface PresenceEntry {
  userId: string;
  firstName: string;
  lastName: string;
  action: 'viewing' | 'idle' | 'editing';
  documentId: string;
  announcedAt: number; // epoch millis
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private static readonly PRESENCE_TTL_SECONDS = 60;
  private static readonly ANNOUNCE_INTERVAL_MS = 30_000;

  constructor(private readonly redis: RedisService) {}

  /**
   * Announce a user's presence on a document. Called by the WebSocket
   * gateway when a client emits `presence:announce`.
   *
   * Stores the presence entry in a Redis sorted set (score = timestamp)
   * and broadcasts to all other users viewing the same document.
   */
  async announcePresence(
    tenantId: string,
    entry: PresenceEntry,
  ): Promise<void> {
    const key = `presence:${tenantId}:${entry.documentId}`;
    const now = Date.now();

    // Store the entry in a Redis hash (userId → JSON) with a sorted set for ordering
    const member = entry.userId;
    await this.redis.connection.hset(key, member, JSON.stringify(entry));
    await this.redis.connection.zadd(key, now, member);
    await this.redis.connection.expire(key, PresenceService.PRESENCE_TTL_SECONDS);

    // Broadcast presence.updated to the document room (spec §13.4)
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'presence.updated',
        payload: {
          tenantId,
          documentId: entry.documentId,
          userId: entry.userId,
          firstName: entry.firstName,
          lastName: entry.lastName,
          action: entry.action,
          announcedAt: new Date(now).toISOString(),
        },
      }),
    );
  }

  /**
   * Remove a user's presence from a document (on disconnect or navigation away).
   */
  async removePresence(tenantId: string, documentId: string, userId: string): Promise<void> {
    const key = `presence:${tenantId}:${documentId}`;
    await this.redis.connection.hdel(key, userId);
    await this.redis.connection.zrem(key, userId);

    // Broadcast departure
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'presence.updated',
        payload: {
          tenantId,
          documentId,
          userId,
          action: 'left',
          announcedAt: new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Get all present users on a document (prunes stale entries > 60s old).
   */
  async getPresence(tenantId: string, documentId: string): Promise<PresenceEntry[]> {
    const key = `presence:${tenantId}:${documentId}`;
    const now = Date.now();
    const cutoff = now - PresenceService.PRESENCE_TTL_SECONDS * 1000;

    // Remove stale entries from the sorted set
    await this.redis.connection.zremrangebyscore(key, '-inf', String(cutoff));

    // Get remaining members
    const members = await this.redis.connection.zrange(key, 0, -1);
    if (members.length === 0) return [];

    const entries: PresenceEntry[] = [];
    const rawEntries = await this.redis.connection.hmget(key, ...members);
    for (const raw of rawEntries) {
      if (raw) {
        try {
          const entry = JSON.parse(raw) as PresenceEntry;
          // Double-check freshness
          if (now - entry.announcedAt < PresenceService.PRESENCE_TTL_SECONDS * 1000) {
            entries.push(entry);
          }
        } catch {
          // skip malformed entries
        }
      }
    }
    return entries;
  }

  // ===========================================================================
  // Crisis Response Room (spec §9.11)
  // ===========================================================================

  /**
   * Broadcast a crisis room event (redaction, annotation, document link)
   * to all participants in the room.
   *
   * Spec ref: §9.11 (Crisis Response Room — synchronized real-time collaboration).
   */
  async broadcastCrisisRoomEvent(
    tenantId: string,
    roomId: string,
    event: {
      type: 'redaction' | 'annotation' | 'document_link' | 'cursor' | 'chat';
      userId: string;
      data: unknown;
    },
  ): Promise<void> {
    const key = `crisis-room:${tenantId}:${roomId}`;

    // Store the event in a Redis list (for missed-event recovery)
    const eventWithTimestamp = {
      ...event,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    await this.redis.connection.rpush(key, JSON.stringify(eventWithTimestamp));
    await this.redis.connection.ltrim(key, -100, -1); // keep last 100 events

    // Broadcast to the crisis room (spec §13.4 — crisisRoom.sync)
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'crisisRoom.sync',
        payload: {
          tenantId,
          roomId,
          event: eventWithTimestamp,
        },
      }),
    );

    this.logger.log(`Crisis room ${roomId} event: ${event.type} by ${event.userId}`);
  }

  /**
   * Get recent crisis room events (for missed-event recovery when a user
   * reconnects).
   */
  async getCrisisRoomEvents(
    tenantId: string,
    roomId: string,
    count = 50,
  ): Promise<unknown[]> {
    const key = `crisis-room:${tenantId}:${roomId}`;
    const rawEvents = await this.redis.connection.lrange(key, -count, -1);
    return rawEvents.map((raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Add a user to a crisis room (records participation for audit).
   */
  async joinCrisisRoom(tenantId: string, roomId: string, userId: string): Promise<void> {
    const key = `crisis-room:${tenantId}:${roomId}:participants`;
    await this.redis.connection.sadd(key, userId);
    await this.redis.connection.expire(key, 86400); // 24h TTL

    // Broadcast join event
    await this.broadcastCrisisRoomEvent(tenantId, roomId, {
      type: 'chat',
      userId,
      data: { action: 'joined' },
    });
  }

  /**
   * Remove a user from a crisis room.
   */
  async leaveCrisisRoom(tenantId: string, roomId: string, userId: string): Promise<void> {
    const key = `crisis-room:${tenantId}:${roomId}:participants`;
    await this.redis.connection.srem(key, userId);

    await this.broadcastCrisisRoomEvent(tenantId, roomId, {
      type: 'chat',
      userId,
      data: { action: 'left' },
    });
  }

  /**
   * Get all participants in a crisis room.
   */
  async getCrisisRoomParticipants(tenantId: string, roomId: string): Promise<string[]> {
    const key = `crisis-room:${tenantId}:${roomId}:participants`;
    return this.redis.connection.smembers(key);
  }
}
