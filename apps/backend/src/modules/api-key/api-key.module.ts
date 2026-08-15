import { Global, Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller.js';
import { ApiKeyService } from './api-key.service.js';

@Global()
@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
