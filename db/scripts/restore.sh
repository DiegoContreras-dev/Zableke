#!/bin/bash
# restore.sh â€” RestauraciÃ³n de la base de datos PostgreSQL

set -e

if [ -z "$1" ]; then
  echo "Uso: ./restore.sh <archivo_backup.sql>"
  exit 1
fi

BACKUP_FILE=$1

echo "Restaurando desde: ${BACKUP_FILE}"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "${BACKUP_FILE}"
echo "RestauraciÃ³n completada."
