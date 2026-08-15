import { Module } from '@nestjs/common';
import { WebSocketGatewayService } from './gateway.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [WebSocketGatewayService, RealtimeGateway],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}
