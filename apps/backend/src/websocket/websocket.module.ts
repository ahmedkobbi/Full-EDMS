import { Module } from '@nestjs/common';
import { WebSocketGatewayService } from './gateway.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  providers: [WebSocketGatewayService, RealtimeGateway],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}
