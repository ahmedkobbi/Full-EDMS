import { Global, Module } from '@nestjs/common';
import { PhysicalTwinController } from './physical-twin.controller';
import { PhysicalTwinService } from './physical-twin.service';

@Global()
@Module({
  controllers: [PhysicalTwinController],
  providers: [PhysicalTwinService],
  exports: [PhysicalTwinService],
})
export class PhysicalTwinModule {}
