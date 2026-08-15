import { Global, Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { OmrService } from './omr.service';
import { IcrService } from './icr.service';
import { BarcodeService } from './barcode.service';
import { HumanVerificationService } from './human-verification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../common/storage.module';
import { RedisModule } from '../../common/redis.module';
import { AuditModule } from '../../common/audit.module';

@Global()
@Module({
  imports: [PrismaModule, StorageModule, RedisModule, AuditModule],
  controllers: [OcrController],
  providers: [OcrService, OmrService, IcrService, BarcodeService, HumanVerificationService],
  exports: [OcrService, OmrService, IcrService, BarcodeService, HumanVerificationService],
})
export class OcrModule {}
