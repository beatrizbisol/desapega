#!/usr/bin/env bash
# Hourly snapshot of the desapega data (orders, items, uploads).
# Keeps 7 days locally; when BACKUP_REMOTE is set (an rclone remote such as
# "r2:desapega-backups"), also copies each snapshot off the VPS.
set -euo pipefail

SRC=/var/lib/desapega
DEST=/var/backups/desapega
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$DEST"
tar -czf "$DEST/desapega-$STAMP.tar.gz" -C "$SRC" .
find "$DEST" -name 'desapega-*.tar.gz' -mtime +7 -delete

if [[ -n "${BACKUP_REMOTE:-}" ]]; then
	rclone copy "$DEST/desapega-$STAMP.tar.gz" "$BACKUP_REMOTE"
fi
