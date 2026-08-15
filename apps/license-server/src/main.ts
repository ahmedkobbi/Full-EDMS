import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

/**
 * Bootstrap the Smart EDMS Licensing Server (Fastify adapter).
 *
 * Spec ref: §4.2 (licensing server model), §7.3 (licensing server stack),
 * §12 (licensing system requirements), §21 (security).
 *
 * The licensing server runs in the vendor's cloud/hosted environment.
 * It holds the private signing keys (loaded at startup from
 * LICENSE_SIGNING_KEY_PATH; chmod 600; never written to logs/DB/HTTP).
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024, // 10MB JSON body (sufficient for .sedmsreq files)
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

  // Rate limit — separate limits for activation, heartbeat, admin.
  // (Spec §27.3 — rate-limit security-relevant endpoints.)
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req: { ip: string; headers: Record<string, string | string[] | undefined> }) => {
      const auth = (req.headers.authorization ?? '').slice(0, 32);
      const apiKey = (req.headers['x-api-key'] as string | undefined)?.slice(0, 16) ?? '';
      return `${req.ip}:${auth}:${apiKey}`;
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();

  // OpenAPI documentation (spec §14.1).
  const config = new DocumentBuilder()
    .setTitle('Smart EDMS Licensing Server API')
    .setDescription(
      'Control plane for license issuance, activation, revocation, ' +
        'heartbeats, trials, and webhook delivery. Spec ref: §4.2, §7.3, §12.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'api-key')
    .addTag('customers')
    .addTag('products')
    .addTag('licenses')
    .addTag('activation')
    .addTag('heartbeat')
    .addTag('trials')
    .addTag('webhooks')
    .addTag('signing-keys')
    .addTag('revocation')
    .addTag('audit')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/v1/docs', app, document, {
    customSiteTitle: 'Smart EDMS Licensing Server API Docs',
  });

  // CORS — restricted by env (spec §21.5).
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5174').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Api-Key'],
  });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 4100);
  const host = configService.get<string>('HOST') ?? '0.0.0.0';

  await app.listen(port, host);
  logger.log(`Smart EDMS Licensing Server listening on http://${host}:${port}`);
  logger.log(`OpenAPI docs at http://${host}:${port}/v1/docs`);
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
