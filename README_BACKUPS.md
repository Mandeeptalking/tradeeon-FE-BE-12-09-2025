# Backups & Restore

## Nightly
- GitHub Action `DB Nightly Backup` runs `pg_dump`, encrypts with AES-256 using `BACKUP_PASSPHRASE`, and stores artifact.

## Manual
```bash
export PG_CONN_URL=...
export BACKUP_PASSPHRASE=...
./scripts/db/backup.sh

Restore
export PG_CONN_URL=...
export BACKUP_PASSPHRASE=...
./scripts/db/restore.sh BACKUP_FILE=dump.sql.enc

