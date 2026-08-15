import { Global, Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller.js';
import { AdminUserService } from './admin-user.service.js';

@Global()
@Module({
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
