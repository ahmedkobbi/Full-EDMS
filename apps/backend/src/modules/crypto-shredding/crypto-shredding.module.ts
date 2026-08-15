import { Global, Module } from '@nestjs/common';
import { CryptoShreddingController } from './crypto-shredding.controller.js';
import { CryptoShreddingService } from './crypto-shredding.service.js';

@Global()
@Module({
  controllers: [CryptoShreddingController],
  providers: [CryptoShreddingService],
  exports: [CryptoShreddingService],
})
export class CryptoShreddingModule {}
