import { Global, Module } from '@nestjs/common';
import { OcrController } from './ocr.controller.js';
import { OcrService } from './ocr.service.js';
import { OmrService } from './omr.service.js';
import { IcrService } from './icr.service.js';
import { BarcodeService } from './barcode.service.js';
import { HumanVerificationService } from './human-verification.service.js';

@Global()
@Module({
  controllers: [OcrController],
  providers: [OcrService, OmrService, IcrService, BarcodeService, HumanVerificationService],
  exports: [OcrService, OmrService, IcrService, BarcodeService, HumanVerificationService],
})
export class OcrModule {}
