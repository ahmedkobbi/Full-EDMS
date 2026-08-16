import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Bootstrap the Smart EDMS on-premise NestJS backend (Fastify adapter).
 * Spec ref: §7.2 (NestJS Backend), §14 (API Contract), §21 (Security).
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 50 * 1024 * 1024, // 50MB JSON body
      logger: false,
      genReqId: () => crypto.randomUUID(),
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(PinoLogger));

  // Security headers — strict CSP, HSTS, clickjacking protection (spec §21.5).
  // Plugin registration is wrapped in try/catch so the backend can boot in dev
  // environments where the exact fastify-plugin version may not be installed.
  try {
    const fastifyHelmet = (await import('@fastify/helmet')).default;
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      noSniff: true,
    });
  } catch (err) {
    logger.warn(`@fastify/helmet skipped: ${(err as Error).message}`);
  }

  try {
    const fastifyCompress = (await import('@fastify/compress')).default;
    await app.register(fastifyCompress);
  } catch (err) {
    logger.warn(`@fastify/compress skipped: ${(err as Error).message}`);
  }
  try {
    const fastifyRateLimit = (await import('@fastify/rate-limit')).default;
    await app.register(fastifyRateLimit, {
      global: true,
      max: 200,
      timeWindow: '1 minute',
      keyGenerator: (req) => {
        const auth = (req.headers.authorization ?? '').slice(0, 32);
        return `${req.ip}:${auth}`;
      },
    });
  } catch (err) {
    logger.warn(`@fastify/rate-limit skipped: ${(err as Error).message}`);
  }
  try {
    const fastifyMultipart = (await import('@fastify/multipart')).default;
    await app.register(fastifyMultipart, {
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB per file
    });
  } catch (err) {
    logger.warn(`@fastify/multipart skipped: ${(err as Error).message}`);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  app.enableShutdownHooks();

  // OpenAPI documentation (spec §14.1).
  const config = new DocumentBuilder()
    .setTitle('Smart EDMS API')
    .setDescription('On-premise Electronic Document Management System — REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('tenant')
    .addTag('users')
    .addTag('documents')
    .addTag('classification')
    .addTag('workflow')
    .addTag('retention')
    .addTag('audit')
    .addTag('search')
    .addTag('share')
    .addTag('license')
    .addTag('scanner')
    .addTag('tours')
    .addTag('ai')
    .addTag('admin')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  try {
    SwaggerModule.setup('/v1/docs', app, document, {
      customSiteTitle: 'Smart EDMS API Docs',
    });
  } catch (err) {
    logger.warn(`Swagger UI setup skipped: ${(err as Error).message}`);
  }

  // CORS — restricted by env (spec §21.5).
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Tenant-Id'],
  });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 4000);
  const host = configService.get<string>('HOST') ?? '0.0.0.0';

  try {
    await app.listen(port, host);
    logger.log(`Smart EDMS backend listening on http://${host}:${port}`);
    logger.log(`OpenAPI docs at http://${host}:${port}/v1/docs`);
  } catch (err) {
    logger.error(`Failed to listen on ${host}:${port}: ${(err as Error).message}`);
    throw err;
  }
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
