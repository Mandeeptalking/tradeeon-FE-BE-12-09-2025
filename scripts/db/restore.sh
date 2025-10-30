#!/usr/bin/env bash
set -euo pipefail
: "${PG_CONN_URL:?PG_CONN_URL missing}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE missing}"
: "${BACKUP_FILE:=dump.sql.enc}"

openssl enc -d -aes-256-cbc -pbkdf2 -k "$BACKUP_PASSPHRASE" -in "$BACKUP_FILE" -out dump.sql
psql "$PG_CONN_URL" -f dump.sql
rm dump.sql
echo "Restore completed."

