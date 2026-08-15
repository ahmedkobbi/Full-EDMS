# ADR-0009: Use BullMQ for background job processing

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §7.2 (NestJS Backend), §22.2 (Scalability), §27.8 (Backend Rules)

## Context

Smart EDMS needs background processing for: document indexing, audit export, retention evaluation, scanner OCR, webhook delivery, and AI request fan-out.

## Decision

Use **BullMQ** (Redis-based queue) with a separate worker process.

## Consequences

### Positive

- Redis-based (we already use Redis for cache + Socket.IO adapter)
- Retries with exponential backoff
- Dead-letter queue for permanent failures
- Idempotent workers (safe retries)
- Priority queues
- Scheduled jobs (cron)
- Observable (Bull Board UI)
- Scales horizontally (add more worker processes)

### Negative

- Requires Redis (already a dependency)
- Job state in Redis (not durable if Redis crashes — mitigated by AOF persistence)
- More complex than inline processing (justified for heavy jobs)

## Alternatives Considered

- **Bull (v3)**: predecessor to BullMQ; less active maintenance; not as well-typed
- **Agenda**: MongoDB-based (we use PostgreSQL + Redis, not Mongo)
- **AWS SQS**: cloud-locked; on-premise deployments can't use it
- **RabbitMQ**: powerful but overkill; requires a separate broker
- **In-process (setImmediate)**: no retries, no persistence, blocks the event loop

## Spec Reference

§7.2 lists "BullMQ" as a required dependency. §27.8: "Every heavy operation must be queued."
