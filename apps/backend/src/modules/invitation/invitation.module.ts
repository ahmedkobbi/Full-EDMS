import { Global, Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller.js';
import { InvitationService } from './invitation.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
