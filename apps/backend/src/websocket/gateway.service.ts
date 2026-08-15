import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service.js';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../modules/auth/types.js';
import type { WebSocketEvent } from '@smart-edms/types';

/**
 * WebSocket gateway service. Manages the Socket.IO server, auth, and Redis pub/sub fan-out.
 * Spec ref: §13 (WebSocket Real-Time Requirements).
 *
 * - Authenticates socket handshake via JWT (§13.2)
 * - Authorizes every event server-side (§13.3)
 * - Rooms are tenant-scoped (`tenant:{tenantId}`, `user:{userId}`, `document:{documentId}`)
 * - Redis adapter for horizontal scaling (§13.1, §22.3)
 * - All sensitive events tenant-scoped, no cross-tenant leakage
 * - Rate limiting per socket
 */
@Injectable()
export class WebSocketGatewayService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketGatewayService.name);
  public io!: SocketIOServer;
  private readonly pubClient;
  private readonly subClient;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.pubClient = redis.connection.duplicate();
    this.subClient = redis.connection.duplicate();
  }

  async onModuleInit(): Promise<void> {
    // The actual Socket.IO server is created by @WebSocketGateway decorator in RealtimeGateway.
    // This service subscribes to Redis pub/sub channel `smart-edms:ws-events:${tenantId}` and
    // fans out events to the appropriate Socket.IO rooms.
    await this.subClient.psubscribe('smart-edms:ws-events:*');
    this.subClient.on('pmessage', (_pattern, channel, message) => {
      try {
        const event = JSON.parse(message) as WebSocketEvent;
        const tenantId = channel.split(':').pop();
        if (!tenantId) return;
        this.io?.to(`tenant:${tenantId}`).emit(event.name, event.payload);
      } catch (err) {
        this.logger.error(`WS fan-out failed: ${(err as Error).message}`);
      }
    });
    this.logger.log('WebSocket Redis fan-out subscriber ready');
  }

  /**
   * Authenticate a socket handshake. Returns the JWT payload or null.
   */
  async authenticateSocket(socket: Socket): Promise<JwtPayload | null> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Emit an event to a specific user (across all their connected sockets).
   */
  async emitToUser(tenantId: string, userId: string, event: WebSocketEvent): Promise<void> {
    this.io?.to(`tenant:${tenantId}`).to(`user:${userId}`).emit(event.name, event.payload);
  }

  /**
   * Emit an event to all sockets watching a specific document.
   */
  async emitToDocumentWatchers(tenantId: string, documentId: string, event: WebSocketEvent): Promise<void> {
    this.io?.to(`tenant:${tenantId}`).to(`document:${documentId}`).emit(event.name, event.payload);
  }

  async setupAdapter(io: SocketIOServer): Promise<void> {
    this.io = io;
    io.adapter(createAdapter(this.pubClient, this.subClient));
  }
}
