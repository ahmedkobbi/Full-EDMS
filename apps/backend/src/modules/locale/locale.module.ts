import { Module } from '@nestjs/common';
import { LocaleController } from './locale.controller.js';
import { LocaleService } from './locale.service.js';

@Module({
  controllers: [LocaleController],
  providers: [LocaleService],
  exports: [LocaleService],
})
export class LocaleModule {}
