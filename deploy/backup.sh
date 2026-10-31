#!/usr/bin/env bash
# Hourly snapshot of the desapega data: a pg_dump of items/orders plus uploads.
# Keeps 7 days locally; when BACKUP_REMOTE is set (an rclone remote such as
# "r2:desapega-backups"), also copies each snapshot off the VPS.
set -euo pipefail

SRC=/var/lib/desapega
DEST=/var/backups/desapega
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$DEST"
# why: copying the live Postgres directory can capture a torn state; pg_dump is
# a consistent snapshot, so the tarball holds the dump and skips the raw files.
docker compose --env-file /opt/desapega/.env.production -f /opt/desapega/docker-compose.prod.yml exec -T db \
	pg_dump -U desapega desapega >"$SRC/desapega.sql"
tar -czf "$DEST/desapega-$STAMP.tar.gz" -C "$SRC" --exclude=./postgres .
find "$DEST" -name 'desapega-*.tar.gz' -mtime +7 -delete

if [[ -n "${BACKUP_REMOTE:-}" ]]; then
	# shellcheck disable=SC2086 # RCLONE_FLAGS holds several flags, e.g. --bind <ipv4>
	rclone ${RCLONE_FLAGS:-} copy "$DEST/desapega-$STAMP.tar.gz" "$BACKUP_REMOTE"
fi
