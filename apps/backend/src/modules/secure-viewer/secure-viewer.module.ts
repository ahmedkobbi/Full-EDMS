import { Global, Module } from '@nestjs/common';
import { SecureViewerController } from './secure-viewer.controller.js';
import { SecureViewerService } from './secure-viewer.service.js';

@Global()
@Module({
  controllers: [SecureViewerController],
  providers: [SecureViewerService],
  exports: [SecureViewerService],
})
export class SecureViewerModule {}
