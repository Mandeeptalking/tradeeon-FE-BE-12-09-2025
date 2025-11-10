# CloudFront Distribution Found

## Distribution Details:
- **ID:** `EMF4IMNT9637C`
- **Domain:** `diwxcdsala8dp.cloudfront.net`
- **Status:** Deployed
- **Alias:** `www.tradeeon.com`

## Commands to Run:

### 1. Check Origin (What CloudFront is serving from):
```bash
aws cloudfront get-distribution \
  --id EMF4IMNT9637C \
  --query "Distribution.DistributionConfig.Origins.Items[0].{DomainName:DomainName,Id:Id,Path:OriginPath}"
```

### 2. Create Invalidation (Clear Cache):
```bash
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*"
```

### 3. Check Invalidation Status:
```bash
aws cloudfront list-invalidations \
  --distribution-id EMF4IMNT9637C \
  --max-items 1
```

## Next Steps:

1. **Check Origin** - See what CloudFront is serving (S3 bucket, custom origin, etc.)
2. **Update Frontend** - Rebuild with `VITE_API_URL=http://api.tradeeon.com`
3. **Upload to Origin** - Upload new build (if S3) or redeploy (if custom origin)
4. **Invalidate Cache** - Clear CloudFront cache to see changes

