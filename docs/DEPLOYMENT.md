# Smart EDMS — Deployment Guide

> Spec reference: §23 (DevOps and Deployment Requirements).

This guide covers production deployment of Smart EDMS on-premise.

## Prerequisites

### Infrastructure

- Linux server (Ubuntu 22.04+ or RHEL 9+ recommended)
- 8+ CPU cores, 32+ GB RAM, 500+ GB SSD
- Docker 24+ and Docker Compose 2.20+
- TLS certificate (Let's Encrypt, internal CA, or commercial CA)
- DNS record pointing to the server
- Firewall allowing inbound 80/tcp (ACME), 443/tcp (HTTPS)
- Outbound access to licensing server (when online mode is used)

### Cryptographic Keys

The licensing server requires an Ed25519 (or ECDSA P-256) signing keypair:

```bash
pnpm --filter @smart-edms/license-server key:generate
# Writes private key to ./license-signing-key.pem (chmod 600)
# Prints public key PEM
```

- **Private key**: lives ONLY on the licensing server, in a KMS/HSM or on disk with chmod 600
- **Public key**: embedded in the on-premise backend at `infra/docker/license-public-key.pem`

Never commit private keys to Git. The `.gitignore` excludes `*.pem` files.

## Production Deployment Steps

### 1. Clone and configure

```bash
git clone <repo-url> /opt/smart-edms
cd /opt/smart-edms
```

### 2. Create environment file

```bash
cd infra/docker
cp .env.example .env
```

Edit `.env` and set **strong, unique** values for:

- `POSTGRES_PASSWORD` — at least 32 random chars
- `S3_SECRET_ACCESS_KEY` — at least 32 random chars
- `OPENSEARCH_ADMIN_PASSWORD` — at least 16 chars, must include uppercase, lowercase, digit, special
- `JWT_SECRET` — at least 64 random chars
- `LICENSE_JWT_SECRET` — at least 64 random chars (separate from JWT_SECRET)
- `LICENSE_SIGNING_KID` — the key ID derived from your signing public key
- `LICENSE_SIGNING_ALG` — `EdDSA` (recommended) or `ES256`
- `WEBHOOK_SIGNING_SECRET` — for signing outgoing webhooks
- `CORS_ORIGINS` — comma-separated list of allowed origins (Electron app origin, etc.)

### 3. Place license keys

```bash
# Copy your license signing keypair:
cp /path/to/license-signing-key.pem infra/docker/license-signing-key.pem
chmod 600 infra/docker/license-signing-key.pem
cp /path/to/license-public-key.pem infra/docker/license-public-key.pem
```

### 4. Place TLS certs

```bash
cp /path/to/fullchain.pem infra/nginx/certs/fullchain.pem
cp /path/to/privkey.pem infra/nginx/certs/privkey.pem
chmod 600 infra/nginx/certs/privkey.pem
```

### 5. Start the stack

```bash
docker compose up -d
```

Wait for all services to be healthy:

```bash
docker compose ps
# All services should show "healthy"
```

### 6. Run database migrations

```bash
docker compose exec api pnpm db:migrate:deploy
docker compose exec license-server pnpm db:migrate:deploy
```

### 7. Verify deployment

```bash
# Health check
curl -fsS https://your-domain/v1/health/ready | jq

# OpenAPI docs (consider IP-restricting in production)
curl -fsS https://your-domain/v1/docs
```

### 8. Activate your license

#### Online activation

From the Electron client's admin panel:
1. Navigate to Settings → License
2. Click "Activate License"
3. Enter your activation code (issued from the License Admin Panel)
4. The backend will call the licensing server, receive a `.sedmslic`, verify it, and store it

#### Offline / air-gap activation

1. In the Electron client, click "Generate Offline Request (.sedmsreq)"
2. The backend generates a `.sedmsreq` file — download it
3. Upload the `.sedmsreq` to the License Admin Panel (offline activations page)
4. Admin reviews and clicks "Issue License"
5. Download the resulting `.sedmslic` file
6. In the Electron client, click "Import License (.sedmslic)" and select the file
7. The backend verifies signature, deployment fingerprint, and entitlements, then activates

## Backup and Restore

### PostgreSQL

```bash
# Backup
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

Schedule daily backups via cron. Retain per your organization's policy (typically 30 days).

### MinIO / Object Storage

```bash
# Mirror bucket to local
mc alias set local http://localhost:9000 $S3_ACCESS_KEY_ID $S3_SECRET_ACCESS_KEY
mc mirror local/smart-edms-documents /backup/minio/

# Or use S3 versioning (enabled in minio-init) + bucket replication
```

### Redis

Redis is configured with AOF persistence (appendonly yes). For backup:

```bash
docker compose exec redis redis-cli BGSAVE
docker cp $(docker compose ps -q redis):/data/dump.rdb /backup/redis/dump_$(date +%Y%m%d).rdb
```

## Monitoring

### Health endpoints

- `GET /v1/health/live` — liveness (always 200 if process is up)
- `GET /v1/health/ready` — readiness (checks DB + Redis connectivity)

### Logs

```bash
# Tail API logs
docker compose logs -f api

# Tail worker logs
docker compose logs -f worker

# Tail license server logs
docker compose logs -f license-server
```

Logs are structured JSON in production. Pipe to your log aggregator (ELK, Loki, Datadog, etc.).

### Audit log integrity

```bash
# Verify hash chain
curl -fsS -H "Authorization: Bearer $ADMIN_JWT" \
  https://your-domain/v1/audit/verify-chain | jq
```

### License state

```bash
curl -fsS -H "Authorization: Bearer $ADMIN_JWT" \
  https://your-domain/v1/license/status | jq
```

## Rolling Updates

### Pull new image and restart services one at a time

```bash
git pull
docker compose build api worker license-server
docker compose up -d --no-deps api
# Wait for api to be healthy
docker compose up -d --no-deps worker
docker compose up -d --no-deps license-server
```

### Run pending migrations

```bash
docker compose exec api pnpm db:migrate:deploy
```

## Rollback

If a deployment fails:

```bash
# Revert code
git reset --hard <previous-commit>

# Rebuild and restart
docker compose build api worker
docker compose up -d --no-deps api worker

# If migrations broke things, restore from backup:
gunzip -c backup_YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

## License Server Deployment (Vendor Side)

The licensing server is typically deployed in the vendor's cloud environment, separate from customer on-premise deployments. Services:

- `license-api` — NestJS API on port 4001
- `license-admin` — React admin panel (static site served via CDN)
- `postgres` — separate database (`smart_edms_license`)
- `redis` — separate cache
- `webhook-worker` — BullMQ worker for webhook delivery
- KMS/HSM or chmod-600 private key file

Signing keys:
- Stored in KMS/HSM where possible
- Never in frontend
- Never in public repositories
- Never in on-premise backend

## Electron Distribution

The Electron app is distributed via:

- **Stable channel**: signed installers from `https://updates.smart-edms.com/stable`
- **Beta channel**: `https://updates.smart-edms.com/beta`
- **Internal channel**: `https://updates.smart-edms.com/internal`

Build the installers:

```bash
pnpm --filter @smart-edms/electron build:electron
# Outputs to apps/electron/release/
```

Code signing is required for production installers. The auto-updater verifies signatures before applying updates.

Enterprise customers can disable auto-update via group policy or environment variable.

## Disaster Recovery

### RTO/RPO targets

- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 24 hours (daily backups)

### Recovery procedure

1. Provision a new server with the same Docker stack
2. Restore PostgreSQL from the most recent backup
3. Restore MinIO bucket from mirror
4. Restore Redis from RDB snapshot (optional — Redis is cache-only)
5. Place license signing keys (these should be in your key management system, not in backups)
6. Start the stack
7. Verify health
8. Update DNS to point to the new server
9. Notify users

## Compliance Notes

- All audit events are append-only and hash-chained
- Legal hold prevents destructive deletion
- Retention schedules enforce disposition
- Cryptographic hashes (SHA-256) on every document version
- C2PA Content Credentials support (where enabled)
- Exportable evidence packages for compliance review
- Tamper-evident audit logs (verified via `/v1/audit/verify-chain`)
