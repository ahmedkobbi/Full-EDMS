import { Global, Module } from '@nestjs/common';
import { ProvenanceController } from './provenance.controller';
import { ProvenanceService } from './provenance.service';

@Global()
@Module({
  controllers: [ProvenanceController],
  providers: [ProvenanceService],
  exports: [ProvenanceService],
})
export class ProvenanceModule {}
