import { Module } from '@nestjs/common';
import { StepUpAuthService } from './step-up-auth.service.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
      }),
    }),
  ],
  providers: [StepUpAuthService],
  exports: [StepUpAuthService, JwtModule],
})
export class StepUpAuthModule {}
