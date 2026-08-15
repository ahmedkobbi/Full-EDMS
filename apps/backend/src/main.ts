import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

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

  await app.register(fastifyCompress);
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const auth = (req.headers.authorization ?? '').slice(0, 32);
      return `${req.ip}:${auth}`;
    },
  });
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB per file
  });

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
  SwaggerModule.setup('/v1/docs', app, document, {
    customSiteTitle: 'Smart EDMS API Docs',
  });

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

  await app.listen(port, host);
  logger.log(`Smart EDMS backend listening on http://${host}:${port}`);
  logger.log(`OpenAPI docs at http://${host}:${port}/v1/docs`);
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
