import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebSocketGatewayService } from './gateway.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [WebSocketGatewayService, RealtimeGateway],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}
