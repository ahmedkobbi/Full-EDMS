import { Controller, Delete, Get, Param, Req } from '@nestjs/common';
import { AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { UseGuards } from '@nestjs/common';
import { DeviceService } from './device.service.js';
import type { AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';

@Controller('v1/devices')
@UseGuards(AdminJwtGuard)
export class DeviceController {
  constructor(private readonly devices: DeviceService) {}

  @Get('license/:licenseId')
  listByLicense(@Param('licenseId') licenseId: string) {
    return this.devices.listByLicense(licenseId);
  }

  @Get('activation/:activationId')
  listByActivation(@Param('activationId') activationId: string) {
    return this.devices.listByActivation(activationId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.devices.getById(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.devices.delete(id, req.admin!.sub);
    return { ok: true };
  }
}
