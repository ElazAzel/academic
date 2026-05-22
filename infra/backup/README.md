# 🔗 Backup — scripts reference

> **Единый источник истины: `docs/backup-restore-runbook.md`**
> Содержит: процедуры бэкапа/восстановления, retention policy, troubleshooting.

Этот файл — краткая справка по S3 media backup.

## S3 Media

```bash
# Backup
aws s3 sync s3://academy-media/ ./backup-media-$(date +%F)/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy

# Restore
aws s3 sync ./backup-media-2026-05-13/ s3://academy-media/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy
```
