#!/bin/sh
set -e

/usr/bin/mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
/usr/bin/mc mb --ignore-existing local/config
/usr/bin/mc cp /forms/tutor-form.json local/config/forms/tutor-form.json

echo "MinIO inicializado correctamente."
