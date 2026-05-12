#!/bin/bash
# FarmaAI Automated Database Backup Script
# This should be scheduled via Cron (e.g., 0 2 * * * /scripts/backup.sh)

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
DB_NAME="farma_prod"

mkdir -p $BACKUP_DIR
echo "Iniciando respaldo de FarmaAI DB..."

# Docker exec to run pg_dump
docker exec crmfarmaia_postgres_1 pg_dump -U farma_admin $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

echo "Respaldo completado: db_backup_$TIMESTAMP.sql.gz"
# Future: Sync to S3 bucket
# aws s3 cp $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz s3://farmaai-prod-backups/
