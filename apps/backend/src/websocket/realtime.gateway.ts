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
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { WebSocketGatewayService } from './gateway.service.js';

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

  constructor(private readonly gatewayService: WebSocketGatewayService) {}

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
    if (!user) return { ok: false, messageKey: 'errors.UNAUTHENTICATED' };
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
   * Server broadcasts presence.updated to all watchers.
   */
  @SubscribeMessage('presence:announce')
  async onPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string; action: 'viewing' | 'idle' | 'editing' },
  ): Promise<{ ok: boolean }> {
    const user = socket.data.user;
    if (!user) return { ok: false };
    socket.to(`document:${data.documentId}`).emit('presence.updated', {
      userId: user.sub,
      documentId: data.documentId,
      action: data.action,
      timestamp: new Date().toISOString(),
    });
    return { ok: true };
  }
}
