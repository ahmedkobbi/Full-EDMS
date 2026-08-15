# ADR-0002: Use NestJS with Fastify adapter (not Express)

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §7.2 (NestJS On-Premise Backend)

## Context

Smart EDMS requires a high-performance backend framework that supports dependency injection, modular architecture, and TypeScript. The spec mandates NestJS but leaves the HTTP adapter choice open.

## Decision

Use **NestJS with the Fastify adapter** (`@nestjs/platform-fastify`).

## Consequences

### Positive

- 2-3x faster throughput than Express (Fastify's schema-based serialization)
- Lower memory footprint
- Built-in JSON Schema validation (we use Zod instead, but Fastify doesn't conflict)
- First-class TypeScript support
- Native async/await (no callback hell)
- WebSocket support via `@nestjs/platform-socket.io`

### Negative

- Some NestJS ecosystem packages assume Express (minor — most are adapter-agnostic)
- Fastify's plugin ecosystem is smaller than Express's (mitigated by NestJS abstractions)

## Alternatives Considered

- **Express**: slower; callback-era design; larger ecosystem but we don't need most of it
- **Koa**: faster than Express but less NestJS support
- **Pure Fastify (no NestJS)**: loses DI, modules, decorators — too much boilerplate

## Spec Reference

§7.2 explicitly states "Fastify adapter preferred for performance."
