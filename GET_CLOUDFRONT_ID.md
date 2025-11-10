# Get CloudFront Distribution ID

## Step 1: Get Distribution ID

Run this command to find your CloudFront distribution ID:

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, 'www.tradeeon.com')].[Id,DomainName,Status]" \
  --output table
```

This will show:
- **Id** - The distribution ID you need
- **DomainName** - Should be `diwxcdsala8dp.cloudfront.net`
- **Status** - Should be `Deployed`

## Step 2: Get More Details (Optional)

To see what origin CloudFront is using:

```bash
# Replace DIST_ID with the actual ID from Step 1
aws cloudfront get-distribution \
  --id DIST_ID \
  --query "Distribution.DistributionConfig.Origins.Items[0].{DomainName:DomainName,Id:Id}"
```

## Step 3: Create Invalidation (After Getting ID)

Once you have the distribution ID, run:

```bash
# Replace DIST_ID with the actual ID
aws cloudfront create-invalidation \
  --distribution-id DIST_ID \
  --paths "/*"
```

## Alternative: Get ID from CloudFront Console

1. Go to **AWS Console** → **CloudFront**
2. Find distribution: `diwxcdsala8dp.cloudfront.net`
3. Click on it
4. Copy the **Distribution ID** from the top

## Quick One-Liner (After Getting ID)

```bash
# Set DIST_ID variable first
DIST_ID="EXXXXXXXXXXXXX"  # Replace with actual ID

# Then create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

