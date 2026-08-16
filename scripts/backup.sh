#!/usr/bin/env bash
# Smart EDMS — Backup script (spec §23 — DevOps and Deployment).
#
# Backs up:
#   1. PostgreSQL database (pg_dump)
#   2. MinIO/S3 bucket (mc mirror)
#   3. Redis persistence (BGSAVE + copy dump.rdb)
#
# Usage:
#   ./scripts/backup.sh [output-dir]
#
# Environment:
#   DATABASE_URL    — PostgreSQL connection string
#   S3_ENDPOINT     — MinIO/S3 endpoint
#   S3_ACCESS_KEY_ID — MinIO access key
#   S3_SECRET_ACCESS_KEY — MinIO secret key
#   S3_BUCKET       — MinIO bucket name
#   REDIS_URL       — Redis connection string
#
# Spec ref: §23 (backup and restore procedures).

set -euo pipefail

OUTPUT_DIR="${1:-./backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUTPUT_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Smart EDMS — Backup                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo "  Output: $OUTPUT_DIR"
echo ""

# ── 1. PostgreSQL Backup ──
echo "── 1. PostgreSQL ──"
if [ -n "${DATABASE_URL:-}" ]; then
  PG_FILE="$OUTPUT_DIR/postgres.sql.gz"
  echo "  Dumping to $PG_FILE..."
  pg_dump "$DATABASE_URL" | gzip > "$PG_FILE"
  SIZE=$(du -h "$PG_FILE" | cut -f1)
  echo "  ✅ PostgreSQL backup complete ($SIZE)"
else
  echo "  ⚠️  DATABASE_URL not set — skipping PostgreSQL backup"
fi
echo ""

# ── 2. MinIO/S3 Backup ──
echo "── 2. MinIO/S3 ──"
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_ACCESS_KEY_ID:-}" ] && [ -n "${S3_SECRET_ACCESS_KEY:-}" ] && [ -n "${S3_BUCKET:-}" ]; then
  MINIO_DIR="$OUTPUT_DIR/minio"
  mkdir -p "$MINIO_DIR"
  if command -v mc &> /dev/null; then
    echo "  Mirroring bucket '$S3_BUCKET' to $MINIO_DIR..."
    mc alias set backup "$S3_ENDPOINT" "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" 2>/dev/null || true
    mc mirror "backup/$S3_BUCKET" "$MINIO_DIR" 2>/dev/null || true
    COUNT=$(find "$MINIO_DIR" -type f | wc -l)
    echo "  ✅ MinIO backup complete ($COUNT files)"
  else
    echo "  ⚠️  mc (MinIO Client) not installed — skipping MinIO backup"
    echo "     Install: https://min.io/docs/minio/linux/reference/minio-mc.html"
  fi
else
  echo "  ⚠️  S3 env vars not set — skipping MinIO backup"
fi
echo ""

# ── 3. Redis Backup ──
echo "── 3. Redis ──"
if [ -n "${REDIS_URL:-}" ]; then
  REDIS_FILE="$OUTPUT_DIR/redis/dump.rdb"
  mkdir -p "$(dirname "$REDIS_FILE")"
  echo "  Triggering Redis BGSAVE..."
  redis-cli -u "$REDIS_URL" BGSAVE 2>/dev/null || true
  # Wait for BGSAVE to complete
  for i in $(seq 1 30); do
    BG=$(redis-cli -u "$REDIS_URL" INFO persistence 2>/dev/null | grep "rdb_bgsave_in_progress" | cut -d: -f2 | tr -d '\r')
    if [ "$BG" = "0" ]; then
      break
    fi
    sleep 1
  done
  # Copy the dump file
  REDIS_DIR=$(redis-cli -u "$REDIS_URL" CONFIG GET dir 2>/dev/null | tail -1 | tr -d '\r')
  REDIS_DBFILENAME=$(redis-cli -u "$REDIS_URL" CONFIG GET dbfilename 2>/dev/null | tail -1 | tr -d '\r')
  if [ -n "$REDIS_DIR" ] && [ -n "$REDIS_DBFILENAME" ] && [ -f "$REDIS_DIR/$REDIS_DBFILENAME" ]; then
    cp "$REDIS_DIR/$REDIS_DBFILENAME" "$REDIS_FILE"
    SIZE=$(du -h "$REDIS_FILE" | cut -f1)
    echo "  ✅ Redis backup complete ($SIZE)"
  else
    echo "  ⚠️  Could not locate Redis dump file — skipping Redis backup"
  fi
else
  echo "  ⚠️  REDIS_URL not set — skipping Redis backup"
fi
echo ""

# ── 4. Backup Manifest ──
MANIFEST="$OUTPUT_DIR/MANIFEST.txt"
cat > "$MANIFEST" << EOF
Smart EDMS Backup Manifest
==========================
Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Hostname: $(hostname)
Version: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

Contents:
  - postgres.sql.gz   — PostgreSQL database dump (gzipped)
  - minio/            — MinIO/S3 bucket mirror
  - redis/dump.rdb    — Redis persistence snapshot
EOF

echo "── Backup Complete ──"
echo "  Manifest: $MANIFEST"
echo "  Output:   $OUTPUT_DIR"
echo ""
echo "To restore, run: ./scripts/restore.sh $OUTPUT_DIR"
