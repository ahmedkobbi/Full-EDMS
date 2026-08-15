# Smart EDMS — Operations Runbook

> Spec reference: §26.18 (Operations Runbook deliverable), §22 (Performance and Scalability), §23 (DevOps and Deployment).
>
> This runbook covers day-to-day operations, monitoring, incident response, and maintenance procedures for the Smart EDMS on-premise backend.

## Table of Contents

1. [Service Overview](#1-service-overview)
2. [Health Checks](#2-health-checks)
3. [Monitoring](#3-monitoring)
4. [Log Analysis](#4-log-analysis)
5. [Common Operations](#5-common-operations)
6. [Incident Response](#6-incident-response)
7. [Backup and Restore](#7-backup-and-restore)
8. [Scaling](#8-scaling)
9. [Updates and Rollbacks](#9-updates-and-rollbacks)
10. [Troubleshooting](#10-troubleshooting)

## 1. Service Overview

### Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| `api` | 4000 | NestJS REST API + WebSocket gateway | `GET /v1/health/ready` |
| `worker` | — | BullMQ background job processor | Process alive + Redis connected |
| `postgres` | 5432 | Primary database (PostgreSQL 16) | `pg_isready` |
| `redis` | 6379 | Cache + queue + Socket.IO adapter | `redis-cli ping` |
| `minio` | 9000 | Object storage (S3-compatible) | `mc ready local` |
| `opensearch` | 9200 | Full-text search index | `GET /_cluster/health` |
| `reverse-proxy` | 80/443 | Nginx TLS termination + routing | `nginx -t` + HTTP 200 |

### Dependencies

```
api → postgres, redis, minio, opensearch
worker → postgres, redis, minio, opensearch
reverse-proxy → api
```

## 2. Health Checks

### Liveness (is the process running?)

```bash
curl -fsS https://your-domain/v1/health/live
# Expected: { "status": "ok", "timestamp": "..." }
```

### Readiness (can the service handle requests?)

```bash
curl -fsS https://your-domain/v1/health/ready
# Expected: { "status": "ready", "checks": { "db": true, "redis": true }, "timestamp": "..." }
```

### Docker Compose health checks

```bash
cd infra/docker
docker compose ps
# All services should show "healthy"
```

### Individual service checks

```bash
# PostgreSQL
docker compose exec postgres pg_isready -U smart_edms

# Redis
docker compose exec redis redis-cli ping

# MinIO
docker compose exec minio mc ready local

# OpenSearch
docker compose exec opensearch curl -fsS -u admin:$OPENSEARCH_ADMIN_PASSWORD http://localhost:9200/_cluster/health
```

## 3. Monitoring

### Key metrics to alert on

| Metric | Threshold | Action |
|--------|-----------|--------|
| API 5xx error rate | > 1% for 5 min | Page on-call |
| API response time (p95) | > 2000ms for 5 min | Investigate slow queries |
| Database connections | > 80% of pool | Scale connection pool or API instances |
| Redis memory | > 80% of 512MB | Check for memory leaks, scale Redis |
| Disk usage (PostgreSQL) | > 80% | Add storage or clean old data |
| Disk usage (MinIO) | > 80% | Add storage or clean old documents |
| Worker queue depth | > 1000 jobs | Scale workers or investigate stuck jobs |
| Worker dead-letter queue | > 10 jobs | Investigate failed jobs |
| License state | `grace_exhausted` or `invalid` | Page on-call + customer admin |
| Audit hash chain | Broken | Page on-call (potential tampering) |
| WebSocket connection count | > 10,000 | Scale API instances |

### Log aggregation

All services log structured JSON (Pino). Pipe to your log aggregator:

```yaml
# ELK / Loki / Datadog config
# Collect from: docker logs smart-edms-api-1, docker logs smart-edms-worker-1
# Index on: traceId, tenantId, userId, level, code
```

### Prometheus metrics

The backend exposes Prometheus-compatible metrics at `/v1/metrics` (when configured). Key metrics:

- `http_requests_total{method, route, status}`
- `http_request_duration_seconds{method, route, quantile}`
- `db_connections_active`
- `redis_commands_total{command}`
- `bullmq_jobs_total{queue, state}`
- `websocket_connections_active`
- `license_state{state}`

## 4. Log Analysis

### Find all events for a specific request

```bash
# Get the X-Request-Id from the client, then:
docker compose logs api | jq 'select(.traceId == "abc-123")'
```

### Find all audit events for a user

```sql
SELECT occurred_at, code, result, reason, resource_type, resource_id, ip_address
FROM audit_events
WHERE tenant_id = $1 AND user_id = $2
ORDER BY occurred_at DESC
LIMIT 100;
```

### Find failed logins

```sql
SELECT occurred_at, user_id, ip_address, reason
FROM audit_events
WHERE code = 'auth.login' AND result = 'deny'
ORDER BY occurred_at DESC
LIMIT 50;
```

### Find cross-tenant access attempts

```sql
SELECT occurred_at, user_id, ip_address, reason
FROM audit_events
WHERE reason LIKE 'cross_tenant%' OR reason LIKE 'tenant_mismatch%'
ORDER BY occurred_at DESC;
```

### Find AI prompt injection attempts

```sql
SELECT occurred_at, user_id, ip_address, metadata
FROM audit_events
WHERE code = 'ai.prompt_injection_detected'
ORDER BY occurred_at DESC;
```

## 5. Common Operations

### Add a new tenant admin

```bash
# 1. Login as existing admin
TOKEN=$(curl -fsS -X POST https://your-domain/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"..."}' | jq -r .accessToken)

# 2. Create the user
curl -X POST https://your-domain/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"newadmin@example.com","firstName":"New","lastName":"Admin","roleCodes":["admin"]}'
```

### Disable a user

```bash
curl -X PATCH https://your-domain/v1/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"SUSPENDED"}'
```

### Verify audit hash chain

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://your-domain/v1/audit/verify-chain
# Expected: { "ok": true }
# If ok=false, check the brokenAt sequence number and investigate
```

### Check license status

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://your-domain/v1/license/status
```

### Force a license heartbeat (when online)

The heartbeat runs automatically every hour. To force one:

```bash
# This requires the license server's API key
curl -X POST https://license-server/v1/heartbeat \
  -H "X-Api-Key: $LICENSE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"licenseId":"...","deploymentId":"...","fingerprintHash":"...","appVersion":"1.0.0","timestamp":"...","usageSummary":{}}'
```

### Rotate JWT secret

**This requires downtime — schedule a maintenance window.**

1. Generate new secret: `openssl rand -hex 64`
2. Update `.env` `JWT_SECRET`
3. Restart API: `docker compose restart api`
4. All existing sessions are invalidated (users must re-login)
5. Update the License Admin Panel + Marketing page if they use the same secret (they should NOT — separate secrets)

### Reindex OpenSearch

If the OpenSearch index becomes corrupted or schema changes:

```bash
# 1. Delete the existing index
curl -X DELETE "http://opensearch:9200/smart-edms-documents" -u admin:$OPENSEARCH_ADMIN_PASSWORD

# 2. Recreate the index
pnpm --filter @smart-edms/backend opensearch:init

# 3. Trigger a full reindex (queued job)
curl -X POST https://your-domain/v1/admin/reindex \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Incident Response

### Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| SEV-1 | System down / data loss | 15 min | API 5xx > 50%, DB down, audit chain broken |
| SEV-2 | Major degradation | 1 hour | License invalid, search down, worker queue stuck |
| SEV-3 | Minor degradation | 4 hours | Slow queries, high error rate on one endpoint |
| SEV-4 | Cosmetic / minor | 1 business day | Translation typo, UI glitch |

### SEV-1: API is down

1. **Check health**: `curl https://your-domain/v1/health/ready`
2. **Check Docker**: `docker compose ps` — are all services healthy?
3. **Check logs**: `docker compose logs api --tail 100`
4. **Common causes**:
   - Database down → restart PostgreSQL, check disk space
   - Redis down → restart Redis
   - License invalid → check license status, import new `.sedmslic`
   - OOM kill → check `docker stats`, increase memory limit
5. **Rollback if needed**: see [Updates and Rollbacks](#9-updates-and-rollbacks)
6. **Communicate**: notify users, update status page

### SEV-1: Audit hash chain broken

1. **Verify**: `curl -H "Authorization: Bearer $TOKEN" https://your-domain/v1/audit/verify-chain`
2. **Identify the broken event**: the `brokenAt` sequence number
3. **Investigate**: query the event and its neighbors
   ```sql
   SELECT * FROM audit_events
   WHERE tenant_id = $1 AND sequence_number BETWEEN $2 - 5 AND $2 + 5
   ORDER BY sequence_number;
   ```
4. **Determine cause**: was it a bug (rare) or tampering (serious)?
5. **If tampering**: preserve evidence, escalate to security team, consider legal action
6. **If bug**: fix the bug, restore the chain from backup (last known good state)
7. **Document**: post-mortem with timeline, root cause, preventive controls

### SEV-2: License state is `invalid`

1. **Check status**: `curl -H "Authorization: Bearer $TOKEN" https://your-domain/v1/license/status`
2. **Common causes**:
   - License expired → renew via License Admin Panel
   - Signature invalid → public key mismatch (check `LICENSE_PUBLIC_KEY_PATH`)
   - Device mismatch → license moved to a different server (re-issue with new fingerprint)
   - Revoked → check with licensing team
3. **Remediate**: import a new `.sedmslic` file via the admin UI
4. **If cannot remediate immediately**: the system enters read-only mode (`grace_exhausted`) — users can still view + export but cannot upload/edit

### SEV-2: Worker queue stuck

1. **Check queue depth**: `docker compose exec redis redis-cli LLEN bull:document-processing:wait`
2. **Check worker logs**: `docker compose logs worker --tail 100`
3. **Common causes**:
   - Worker crashed → restart: `docker compose restart worker`
   - Stuck job → move to failed: `docker compose exec redis redis-cli LREM bull:document-processing:active 1 "<job-json>"`
   - Dead-letter full → inspect dead-letter jobs, fix root cause, clear
4. **Scale workers if needed**: `docker compose up -d --scale worker=3`

## 7. Backup and Restore

### Backup schedule

| What | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| PostgreSQL | Daily 02:00 UTC | 30 days | Off-site encrypted |
| MinIO bucket | Daily 03:00 UTC | 30 days | Off-site encrypted |
| Redis | Daily 04:00 UTC (BGSAVE) | 7 days | Off-site encrypted |
| Config (.env, keys) | On change | Indefinitely | Secret manager |

### PostgreSQL backup

```bash
# Backup
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to off-site storage (S3, etc.)
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://smart-edms-backups/$(date +%Y/%m/%d)/

# Restore
gunzip -c backup_YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

### MinIO backup

```bash
# Using mc (MinIO Client)
mc alias set local http://localhost:9000 $S3_ACCESS_KEY_ID $S3_SECRET_ACCESS_KEY
mc mirror local/smart-edms-documents /backup/minio/$(date +%Y%m%d)/

# Or enable bucket replication to a remote MinIO/S3 (continuous)
```

### Restore procedure

1. Stop the API + worker: `docker compose stop api worker`
2. Restore PostgreSQL from backup
3. Restore MinIO bucket from mirror
4. Restore Redis from RDB snapshot (optional — Redis is cache-only)
5. Restart services: `docker compose up -d`
6. Verify health: `curl https://your-domain/v1/health/ready`
7. Verify audit chain: `curl -H "Authorization: Bearer $TOKEN" https://your-domain/v1/audit/verify-chain`

## 8. Scaling

### Horizontal scaling

- **API**: stateless — scale behind load balancer: `docker compose up -d --scale api=3`
- **Worker**: stateless — scale independently: `docker compose up -d --scale worker=3`
- **WebSocket**: Redis adapter handles multi-instance fan-out
- **PostgreSQL**: read replicas (requires PgBouncer or app-level read/write split)

### Vertical scaling

- **PostgreSQL**: increase `shared_buffers`, `effective_cache_size`
- **Redis**: increase `maxmemory` (currently 512MB)
- **OpenSearch**: increase JVM heap (`OPENSEARCH_JAVA_OPTS`)

### When to scale

| Signal | Action |
|--------|--------|
| API CPU > 70% | Scale API horizontally |
| API memory > 80% | Scale API horizontally (or fix memory leak) |
| DB CPU > 70% | Add read replicas or scale up DB instance |
| DB connections > 80% of pool | Increase Prisma connection limit or scale API |
| Redis memory > 80% | Increase `maxmemory` or scale Redis |
| Worker queue depth > 1000 | Scale workers |
| OpenSearch CPU > 70% | Scale OpenSearch nodes |

## 9. Updates and Rollbacks

### Rolling update

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker compose build api worker

# 3. Pull new images (if using a registry)
docker compose pull

# 4. Restart services one at a time
docker compose up -d --no-deps api
# Wait for healthy
docker compose up -d --no-deps worker

# 5. Run pending migrations
docker compose exec api pnpm db:migrate:deploy
```

### Rollback

```bash
# 1. Revert code
git reset --hard <previous-commit>

# 2. Rebuild
docker compose build api worker

# 3. Restart
docker compose up -d --no-deps api worker

# 4. If migrations broke things, restore from backup:
gunzip -c backup_YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

### Database migration safety

- **Never run migrations that destroy data without a backup**
- **Test migrations on staging first**
- **Use `prisma migrate deploy` (not `dev`) in production** — only applies migrations that exist, doesn't create new ones
- **If a migration fails midway**: Prisma marks it as failed. Either fix + re-run, or rollback manually + restore.

## 10. Troubleshooting

### "Cannot connect to PostgreSQL"

1. Check PostgreSQL is running: `docker compose ps postgres`
2. Check credentials in `.env` match `docker-compose.yml`
3. Check network: `docker compose exec api ping postgres`
4. Check logs: `docker compose logs postgres`

### "Redis connection refused"

1. Check Redis is running: `docker compose ps redis`
2. Check `REDIS_URL` in `.env`
3. Check Redis isn't out of memory: `docker compose exec redis redis-cli INFO memory`

### "License state is invalid"

1. Check `LICENSE_PUBLIC_KEY_PATH` exists and is readable
2. Check the public key matches the signing key: compare `kid` in `.sedmslic` with the derived `kid` from the public key
3. Check the deployment fingerprint matches: the license is bound to the machine that generated the `.sedmsreq`
4. Check the license isn't revoked: fetch the CRL from the license server

### "WebSocket connections failing"

1. Check Nginx config has the `/realtime/` location with WebSocket upgrade headers
2. Check the JWT is valid (not expired, not revoked)
3. Check the user's tenant matches
4. Check Redis is running (Socket.IO Redis adapter)

### "Upload fails with 413"

1. Check `client_max_body_size` in Nginx (should be 5g)
2. Check Fastify `bodyLimit` (50MB for JSON)
3. Check `fastifyMultipart` `limits.fileSize` (5GB)

### "AI Assistant not responding"

1. Check `AI_PROVIDER` env (if `none`, AI returns "not configured")
2. Check tenant AI settings: `GET /v1/admin/ai/settings` — `enabled` should be `true`
3. Check license entitlement: `ai-assistant` module must be in `entitlements`
4. Check rate limit: user may have exceeded 20/min or 200/day
5. Check external AI provider (if `AI_PROVIDER=external`): is `AI_EXTERNAL_API_URL` reachable? Is the API key valid?
6. Check logs: `docker compose logs api | grep -i ai`

### "Audit hash chain verification fails"

1. Run `GET /v1/audit/verify-chain` to get the `brokenAt` sequence number
2. Query the event: `SELECT * FROM audit_events WHERE sequence_number = $1`
3. Check if the event was modified (compare `event_hash` with recomputed hash)
4. If tampering suspected: preserve evidence, escalate to security
5. If bug suspected: restore the chain from the last backup where verification passed
