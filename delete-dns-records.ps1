# Delete DNS Records from Route 53
# This script deletes the A, AAAA, and CNAME records from the tradeeon.com hosted zone

$HOSTED_ZONE_ID = "Z07343073C3CAVJ25RN36"

Write-Host "`nDeleting DNS Records from Route 53...`n" -ForegroundColor Cyan

# First, let's get the exact record details
Write-Host "Fetching current records...`n" -ForegroundColor Yellow
$records = aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --output json | ConvertFrom-Json

Write-Host "Found the following records:`n" -ForegroundColor Green
foreach ($record in $records.ResourceRecordSets) {
    if ($record.Type -ne "NS" -and $record.Type -ne "SOA") {
        Write-Host "  - $($record.Name) (Type: $($record.Type))" -ForegroundColor White
    }
}

Write-Host "`nAttempting to delete custom records...`n" -ForegroundColor Yellow

# Delete A record
Write-Host "1. Deleting A record..." -ForegroundColor Cyan
$changeBatch = @{
    Changes = @(
        @{
            Action = "DELETE"
            ResourceRecordSet = @{
                Name = "www.tradeeon.com"
                Type = "A"
                AliasTarget = @{
                    DNSName = "d17hg7j76nwuhw.cloudfront.net"
                    EvaluateTargetHealth = $false
                    HostedZoneId = "Z2FDTNDATAQYW2"
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $result = aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $changeBatch --output json | ConvertFrom-Json
    Write-Host "   A record deletion initiated. Change ID: $($result.ChangeInfo.Id)" -ForegroundColor Green
} catch {
    Write-Host "   Error deleting A record: $_" -ForegroundColor Red
}

# Delete AAAA record
Write-Host "`n2. Deleting AAAA record..." -ForegroundColor Cyan
$changeBatch = @{
    Changes = @(
        @{
            Action = "DELETE"
            ResourceRecordSet = @{
                Name = "www.tradeeon.com"
                Type = "AAAA"
                AliasTarget = @{
                    DNSName = "d3reix1p0rkbbz.cloudfront.net"
                    EvaluateTargetHealth = $false
                    HostedZoneId = "Z2FDTNDATAQYW2"
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $result = aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $changeBatch --output json | ConvertFrom-Json
    Write-Host "   AAAA record deletion initiated. Change ID: $($result.ChangeInfo.Id)" -ForegroundColor Green
} catch {
    Write-Host "   Error deleting AAAA record: $_" -ForegroundColor Red
}

# Delete CNAME record - need to get exact details first
Write-Host "`n3. Finding CNAME record..." -ForegroundColor Cyan
$cnameRecord = $records.ResourceRecordSets | Where-Object { $_.Type -eq "CNAME" -and $_.Name -like "*_*" }

if ($cnameRecord) {
    Write-Host "   Found CNAME record: $($cnameRecord.Name)" -ForegroundColor White
    
    $changeBatch = @{
        Changes = @(
            @{
                Action = "DELETE"
                ResourceRecordSet = @{
                    Name = $cnameRecord.Name
                    Type = "CNAME"
                    TTL = $cnameRecord.TTL
                    ResourceRecords = $cnameRecord.ResourceRecords
                }
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        $result = aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $changeBatch --output json | ConvertFrom-Json
        Write-Host "   CNAME record deletion initiated. Change ID: $($result.ChangeInfo.Id)" -ForegroundColor Green
    } catch {
        Write-Host "   Error deleting CNAME record: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   No CNAME record found (may have been deleted already)" -ForegroundColor Yellow
}

Write-Host "`nDone! Records should be deleted within a few seconds.`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 10-30 seconds for changes to propagate" -ForegroundColor White
Write-Host "2. Go to Route 53 console and verify only NS and SOA records remain" -ForegroundColor White
Write-Host "3. Then delete the hosted zone" -ForegroundColor White
Write-Host ""

