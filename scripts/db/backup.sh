#!/usr/bin/env bash
set -euo pipefail
: "${PG_CONN_URL:?PG_CONN_URL missing}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE missing}"

pg_dump "$PG_CONN_URL" --no-owner --no-privileges --format=plain > dump.sql
openssl enc -aes-256-cbc -salt -pbkdf2 -k "$BACKUP_PASSPHRASE" -in dump.sql -out dump.sql.enc
rm dump.sql
echo "Encrypted dump at dump.sql.enc"

