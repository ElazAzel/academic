# S3-Compatible Storage Configuration

## Production Setup

### 1. Create Bucket

```bash
# AWS S3
aws s3 mb s3://academy-media --region eu-central-1

# MinIO  
mc mb myminio/academy-media
```

### 2. Set Environment Variables

```env
S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
S3_REGION=eu-central-1
S3_BUCKET=academy-media
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=false
```

### 3. CORS Policy

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-domain.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### 4. Lifecycle Policy (auto-cleanup temp uploads)

```json
{
  "Rules": [
    {
      "Filter": {"Prefix": "temp/"},
      "Status": "Enabled",
      "Expiration": {"Days": 1}
    }
  ]
}
```

## Verification

```bash
# Test presigned upload
curl -X POST https://your-domain.com/api/v1/media/uploads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.txt","contentType":"text/plain","fileSize":10}'

# Expected response: { "url": "...", "publicUrl": "...", "key": "uploads/test.txt" }
```
