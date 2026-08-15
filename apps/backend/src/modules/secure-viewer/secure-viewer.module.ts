import { Global, Module } from '@nestjs/common';
import { SecureViewerController } from './secure-viewer.controller';
import { SecureViewerService } from './secure-viewer.service';

@Global()
@Module({
  controllers: [SecureViewerController],
  providers: [SecureViewerService],
  exports: [SecureViewerService],
})
export class SecureViewerModule {}
