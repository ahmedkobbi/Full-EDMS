# ADR-0010: Use Socket.IO with Redis adapter for WebSocket scaling

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §13.1 (WebSocket Technology), §22.3 (WebSocket Scalability)

## Context

Smart EDMS requires real-time WebSocket events. When the backend scales to multiple instances (horizontal scaling), WebSocket connections are distributed across instances — events emitted on one instance must reach sockets connected to other instances.

## Decision

Use **Socket.IO with the Redis adapter** (`@socket.io/redis-adapter`).

## Consequences

### Positive

- Multi-instance fan-out (event emitted on instance A reaches sockets on instance B)
- Room-based scoping (`tenant:{tid}`, `user:{uid}`, `document:{docId}`)
- Automatic reconnection with backoff
- Ping/pong heartbeat
- Event deduplication
- Mature library with large ecosystem

### Negative

- Socket.IO protocol overhead (vs. raw ws) — acceptable for the features gained
- Requires Redis (already a dependency)
- Adapter adds slight latency for cross-instance events (~1-2ms)

## Alternatives Considered

- **Raw `ws` library**: maximum performance but no adapter, no rooms, no reconnection, no fallback to long-polling
- **Centrifugo**: separate service; powerful but adds infrastructure
- **NATS**: messaging-focused; not a WebSocket library
- **AWS API Gateway WebSocket**: cloud-locked; on-premise can't use it

## Spec Reference

§13.1: "Socket.IO, NestJS WebSocket gateway, Redis adapter for horizontal scaling." §22.3: "Redis adapter for Socket.IO when running multiple instances."
