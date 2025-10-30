migrate:
	@echo "Apply SQL migrations…"
	@for f in supabase/migrations/*.sql; do echo "Running $$f"; psql "$$PG_CONN_URL" -f "$$f"; done

seed:
	@echo "Seeding alerts…"
	@psql "$$PG_CONN_URL" -f supabase/seed/alerts_seed.sql

backup:
	@./scripts/db/backup.sh

