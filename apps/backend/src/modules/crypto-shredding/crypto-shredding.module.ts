import { Global, Module } from '@nestjs/common';
import { CryptoShreddingController } from './crypto-shredding.controller';
import { CryptoShreddingService } from './crypto-shredding.service';

@Global()
@Module({
  controllers: [CryptoShreddingController],
  providers: [CryptoShreddingService],
  exports: [CryptoShreddingService],
})
export class CryptoShreddingModule {}
