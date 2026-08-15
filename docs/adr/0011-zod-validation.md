# ADR-0011: Use Zod for all input validation

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §14.1 (API Principles), §27.1 (Code Quality)

## Context

Smart EDMS needs input validation at every API boundary. The spec mentions both Zod and class-validator (NestJS default).

## Decision

Use **Zod** as the single source of truth for runtime validation. The `@smart-edms/schemas` package contains all Zod schemas, shared across backend, frontend, and license server.

## Consequences

### Positive

- Single source of truth (schema = type = runtime validator)
- TypeScript inference (`z.infer<typeof X>`)
- Tree-shakable
- Composable (unions, intersections, transforms)
- Strict mode (`.strict()` rejects unknown fields)
- Works in browser + Node.js (no decorator metadata needed)
- Better error messages than class-validator

### Negative

- Slightly more boilerplate than decorators (acceptable for the type safety gained)
- NestJS `ValidationPipe` works with class-validator by default — we use a custom pipe or manual `schema.parse()`
- Class-transformer not needed (Zod handles transforms)

## Alternatives Considered

- **class-validator + class-transformer**: NestJS default; decorator-based; less type-safe; runtime errors
- **Joi**: older; less TypeScript integration; not composable
- **Yup**: similar to Zod but slower; less active maintenance
- **No validation**: unacceptable (security risk)

## Spec Reference

§7.2 lists "Zod validation." §27.1: "validate all external input." §14.1: "strict DTO validation."
