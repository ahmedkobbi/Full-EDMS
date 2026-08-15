import { Global, Module } from '@nestjs/common';
import { SigningKeyService } from './signing-key.service.js';
import { SigningKeyController } from './signing-key.controller.js';

@Global()
@Module({
  controllers: [SigningKeyController],
  providers: [SigningKeyService],
  exports: [SigningKeyService],
})
export class SigningKeyModule {}
