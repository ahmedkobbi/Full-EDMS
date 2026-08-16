#!/usr/bin/env bash
# Smart EDMS — Restore script (spec §23 — DevOps and Deployment).
#
# Restores from a backup directory created by backup.sh.
#
# Usage:
#   ./scripts/restore.sh <backup-dir>
#
# Environment:
#   DATABASE_URL    — PostgreSQL connection string
#   S3_ENDPOINT     — MinIO/S3 endpoint
#   S3_ACCESS_KEY_ID — MinIO access key
#   S3_SECRET_ACCESS_KEY — MinIO secret key
#   S3_BUCKET       — MinIO bucket name
#   REDIS_URL       — Redis connection string
#
# WARNING: This will OVERWRITE existing data. Stop the backend first.
#
# Spec ref: §23 (backup and restore procedures).

set -euo pipefail

BACKUP_DIR="${1:?Usage: ./scripts/restore.sh <backup-dir>}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Smart EDMS — Restore                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo "  Source: $BACKUP_DIR"
echo ""
echo "  ⚠️  WARNING: This will OVERWRITE existing data!"
echo "  Make sure the backend is stopped."
echo ""
read -p "  Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "  Aborted."
  exit 0
fi
echo ""

# ── 1. PostgreSQL Restore ──
echo "── 1. PostgreSQL ──"
PG_FILE="$BACKUP_DIR/postgres.sql.gz"
if [ -f "$PG_FILE" ]; then
  echo "  Restoring from $PG_FILE..."
  gunzip -c "$PG_FILE" | psql "$DATABASE_URL" 2>&1 | tail -5
  echo "  ✅ PostgreSQL restore complete"
else
  echo "  ⚠️  PostgreSQL backup not found — skipping"
fi
echo ""

# ── 2. MinIO/S3 Restore ──
echo "── 2. MinIO/S3 ──"
MINIO_DIR="$BACKUP_DIR/minio"
if [ -d "$MINIO_DIR" ]; then
  if command -v mc &> /dev/null; then
    echo "  Restoring from $MINIO_DIR to bucket '$S3_BUCKET'..."
    mc alias set restore "$S3_ENDPOINT" "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" 2>/dev/null || true
    mc mb "restore/$S3_BUCKET" 2>/dev/null || true
    mc mirror "$MINIO_DIR" "restore/$S3_BUCKET" 2>/dev/null || true
    echo "  ✅ MinIO restore complete"
  else
    echo "  ⚠️  mc (MinIO Client) not installed — skipping MinIO restore"
  fi
else
  echo "  ⚠️  MinIO backup not found — skipping"
fi
echo ""

# ── 3. Redis Restore ──
echo "── 3. Redis ──"
REDIS_FILE="$BACKUP_DIR/redis/dump.rdb"
if [ -f "$REDIS_FILE" ]; then
  echo "  Restoring Redis from $REDIS_FILE..."
  REDIS_DIR=$(redis-cli -u "$REDIS_URL" CONFIG GET dir 2>/dev/null | tail -1 | tr -d '\r')
  REDIS_DBFILENAME=$(redis-cli -u "$REDIS_URL" CONFIG GET dbfilename 2>/dev/null | tail -1 | tr -d '\r')
  if [ -n "$REDIS_DIR" ] && [ -n "$REDIS_DBFILENAME" ]; then
    redis-cli -u "$REDIS_URL" SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 2
    cp "$REDIS_FILE" "$REDIS_DIR/$REDIS_DBFILENAME"
    echo "  ✅ Redis restore complete (requires Redis restart)"
    echo "  Restart Redis: sudo systemctl restart redis"
  else
    echo "  ⚠️  Could not determine Redis data directory — skipping"
  fi
else
  echo "  ⚠️  Redis backup not found — skipping"
fi
echo ""

echo "── Restore Complete ──"
echo "  Start the backend and verify data integrity."
echo "  Run: pnpm --filter @smart-edms/backend db:migrate:deploy"
