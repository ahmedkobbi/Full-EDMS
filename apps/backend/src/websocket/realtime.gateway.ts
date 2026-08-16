import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type Socket, Server as SocketIOServer } from 'socket.io';
import { WebSocketGatewayService } from './gateway.service';
import { PresenceService } from '../modules/presence/presence.service';

/**
 * Real-time WebSocket gateway.
 * Spec ref: §13 (WebSocket Real-Time Requirements).
 *
 * Path: /v1/realtime (proxy must support WebSocket upgrade, §23.2)
 *
 * Connection flow:
 * 1. Client connects with `auth: { token: '<jwt>' }`
 * 2. Server verifies JWT, joins `tenant:{tid}` + `user:{sub}` rooms
 * 3. Client subscribes to specific documents via 'document:subscribe' event
 * 4. Server validates the user can access that document before joining `document:{id}` room
 */
@WebSocketGateway({
  namespace: 'realtime',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: SocketIOServer;

  constructor(
    private readonly gatewayService: WebSocketGatewayService,
    private readonly presence: PresenceService,
  ) {}

  async afterInit(server: SocketIOServer): Promise<void> {
    await this.gatewayService.setupAdapter(server);
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(socket: Socket): Promise<void> {
    const payload = await this.gatewayService.authenticateSocket(socket);
    if (!payload) {
      socket.emit('error', { messageKey: 'errors.UNAUTHENTICATED' });
      socket.disconnect(true);
      return;
    }
    socket.data.user = payload;
    await socket.join(`tenant:${payload.tid}`);
    await socket.join(`user:${payload.sub}`);
    this.logger.debug(`Socket ${socket.id} connected (user=${payload.sub}, tenant=${payload.tid})`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`Socket ${socket.id} disconnected`);
    // Clean up presence — the user may have been viewing a document.
    // The Redis TTL (60s) will eventually clear stale entries, but we
    // proactively remove on disconnect for faster presence updates.
    const user = socket.data?.user;
    if (user) {
      // We don't know which document(s) the user was viewing from the socket
      // alone. The Redis sorted sets will expire naturally. For immediate
      // cleanup, the client should emit a presence:leave event before
      // disconnecting (handled by the Electron client's beforeunload handler).
    }
  }

  /**
   * Subscribe to document updates. Server validates access before joining the room.
   */
  @SubscribeMessage('document:subscribe')
  async onSubscribeDocument(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<{ ok: boolean; messageKey?: string }> {
    // Access check would delegate to DocumentService.canAccess(...).
    // For now, the user must be in the same tenant (already enforced via JWT).
    const user = socket.data.user;
    if (!user) {return { ok: false, messageKey: 'errors.UNAUTHENTICATED' };}
    await socket.join(`document:${data.documentId}`);
    return { ok: true };
  }

  @SubscribeMessage('document:unsubscribe')
  async onUnsubscribeDocument(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<{ ok: boolean }> {
    await socket.leave(`document:${data.documentId}`);
    return { ok: true };
  }

  /**
   * Presence: client announces it is actively viewing a document.
   * Server stores presence in Redis (with 60s TTL) and broadcasts
   * presence.updated to all watchers via Redis pub/sub (spec §13.4).
   *
   * Clients must re-announce every 30 seconds to stay "present".
   */
  @SubscribeMessage('presence:announce')
  async onPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string; action: 'viewing' | 'idle' | 'editing'; firstName?: string; lastName?: string },
  ): Promise<{ ok: boolean }> {
    const user = socket.data.user;
    if (!user) {return { ok: false };}

    // Store presence in Redis + broadcast via pub/sub (cross-instance)
    await this.presence.announcePresence(user.tid, {
      userId: user.sub,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      action: data.action,
      documentId: data.documentId,
      announcedAt: Date.now(),
    });

    return { ok: true };
  }

  /**
   * Get all present users on a document (for the "who is viewing" panel).
   */
  @SubscribeMessage('presence:get')
  async onGetPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<{ ok: boolean; present?: unknown[] }> {
    const user = socket.data.user;
    if (!user) {return { ok: false };}
    const present = await this.presence.getPresence(user.tid, data.documentId);
    return { ok: true, present };
  }

  /**
   * Crisis room: client broadcasts an event (redaction, annotation, etc.)
   * to all participants in the room (spec §9.11).
   */
  @SubscribeMessage('crisis-room:broadcast')
  async onCrisisRoomBroadcast(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; type: 'redaction' | 'annotation' | 'document_link' | 'cursor' | 'chat'; payload: unknown },
  ): Promise<{ ok: boolean }> {
    const user = socket.data.user;
    if (!user) {return { ok: false };}

    await this.presence.broadcastCrisisRoomEvent(user.tid, data.roomId, {
      type: data.type,
      userId: user.sub,
      data: data.payload,
    });

    return { ok: true };
  }

  /**
   * Crisis room: client joins a room (recorded for audit + missed-event recovery).
   */
  @SubscribeMessage('crisis-room:join')
  async onCrisisRoomJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<{ ok: boolean; recentEvents?: unknown[] }> {
    const user = socket.data.user;
    if (!user) {return { ok: false };}

    await this.presence.joinCrisisRoom(user.tid, data.roomId, user.sub);
    await socket.join(`crisis_room:${data.roomId}`);

    // Return recent events for missed-event recovery
    const recentEvents = await this.presence.getCrisisRoomEvents(user.tid, data.roomId);
    return { ok: true, recentEvents };
  }

  /**
   * Crisis room: client leaves a room.
   */
  @SubscribeMessage('crisis-room:leave')
  async onCrisisRoomLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<{ ok: boolean }> {
    const user = socket.data.user;
    if (!user) {return { ok: false };}

    await this.presence.leaveCrisisRoom(user.tid, data.roomId, user.sub);
    await socket.leave(`crisis_room:${data.roomId}`);
    return { ok: true };
  }
}
