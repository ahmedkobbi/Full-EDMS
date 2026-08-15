import { Global, Module } from '@nestjs/common';
import { PhysicalTwinController } from './physical-twin.controller.js';
import { PhysicalTwinService } from './physical-twin.service.js';

@Global()
@Module({
  controllers: [PhysicalTwinController],
  providers: [PhysicalTwinService],
  exports: [PhysicalTwinService],
})
export class PhysicalTwinModule {}
