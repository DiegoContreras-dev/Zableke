#!/bin/bash
# backup.sh — Backup de la base de datos PostgreSQL

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

echo "Creando backup: ${BACKUP_FILE}"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "/backups/${BACKUP_FILE}"
echo "Backup completado: ${BACKUP_FILE}"
