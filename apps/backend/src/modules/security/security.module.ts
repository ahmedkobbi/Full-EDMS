import { Module } from '@nestjs/common';
import { SecurityIncidentController } from './security-incident.controller';
import { SecurityIncidentService } from './security-incident.service';

@Module({
  controllers: [SecurityIncidentController],
  providers: [SecurityIncidentService],
  exports: [SecurityIncidentService],
})
export class SecurityModule {}
