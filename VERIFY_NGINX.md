# Verify Nginx Setup

## Quick Verification Commands

Run these in your Lightsail SSH terminal to check if Nginx is properly configured:

```bash
# 1. Check if Nginx is running
sudo systemctl status nginx

# 2. Check if Nginx configuration is valid
sudo nginx -t

# 3. Check if port 80 is listening
sudo netstat -tlnp | grep 80

# 4. Test backend via Nginx (port 80)
curl http://localhost/health

# 5. Test via static IP (port 80)
curl http://18.136.45.140/health

# 6. Test via domain (port 80)
curl http://api.tradeeon.com/health

# 7. Check Nginx error logs if issues
sudo tail -20 /var/log/nginx/error.log
```

## Expected Results

- ✅ Nginx should be running (status: active)
- ✅ Port 80 should be listening
- ✅ `curl http://localhost/health` should return JSON response
- ✅ `curl http://18.136.45.140/health` should work
- ✅ `curl http://api.tradeeon.com/health` should work (after DNS propagates)

## If Something Doesn't Work

### Nginx not running:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configuration error:
```bash
# Check configuration
sudo nginx -t

# View configuration
sudo cat /etc/nginx/sites-available/tradeeon-backend
```

### Port 80 not accessible:
- Check Lightsail firewall has port 80 open
- Verify Nginx is listening: `sudo netstat -tlnp | grep 80`

### Domain not resolving:
```bash
# Check DNS
nslookup api.tradeeon.com

# Should show: 18.136.45.140
```

