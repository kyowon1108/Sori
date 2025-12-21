#!/bin/bash
# backup-db.sh - PostgreSQL 데이터베이스 백업 스크립트

BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-sori_db}"
DB_USER="${DB_USER:-sori_user}"

mkdir -p $BACKUP_DIR

# PostgreSQL 백업
PGPASSWORD=$DB_PASSWORD pg_dump -h postgres -U $DB_USER -d $DB_NAME \
    > $BACKUP_DIR/sori_$TIMESTAMP.sql

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "sori_*.sql" -mtime +30 -delete

echo "Backup completed: sori_$TIMESTAMP.sql"
