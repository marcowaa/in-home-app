#!/bin/sh
# Database backup script - runs daily
# Backups are stored in /backups with 7-day retention

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup of ${POSTGRES_DB}..."

# Create backup using pg_dump
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h db \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_FILE}"

# Also backup all tenant databases
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%';" 2>/dev/null | while read -r tenant_db; do
  tenant_db=$(echo "$tenant_db" | tr -d '[:space:]')
  if [ -n "$tenant_db" ]; then
    echo "[$(date)] Backing up tenant: ${tenant_db}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
      -h db \
      -U "${POSTGRES_USER}" \
      -d "${tenant_db}" \
      --no-owner \
      --no-privileges \
      | gzip > "${BACKUP_DIR}/${tenant_db}_${TIMESTAMP}.sql.gz" 2>/dev/null || echo "Warning: Could not backup ${tenant_db}"
  fi
done

# Remove backups older than 7 days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -10
