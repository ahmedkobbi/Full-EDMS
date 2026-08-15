import { Global, Module } from '@nestjs/common';
import { DeviceController } from './device.controller.js';
import { DeviceService } from './device.service.js';

@Global()
@Module({
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
