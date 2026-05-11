#!/bin/bash
# init.sh - Inicialización del contenedor PostgreSQL
# Se ejecuta automáticamente en el primer arranque del contenedor

set -e

echo "Inicializando base de datos Zableke..."

# Las extensiones y configuraciones iniciales van aquí
# psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo "Base de datos inicializada correctamente."
