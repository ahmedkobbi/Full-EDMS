import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

/**
 * Global JWT module — registers JwtModule with the licensing server's
 * secret + TTL, and exports it for use across all modules
 * (AdminJwtGuard, StepUpGuard, future admin login controller).
 *
 * Spec ref: §21.2 (authentication).
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get<number>('JWT_ACCESS_TTL_SECONDS') ?? 900,
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
