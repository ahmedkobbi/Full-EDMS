import { Global, Module } from '@nestjs/common';
import { ApiKeyAdminController } from './api-key.controller.js';
import { ApiKeyService } from './api-key.service.js';

@Global()
@Module({
  controllers: [ApiKeyAdminController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
