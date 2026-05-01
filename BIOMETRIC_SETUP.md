# ZKTeco K40 Biometric Integration Setup Guide

This guide will help you integrate the ZKTeco K40 Thumb Attendance Machine with your attendance system.

## Prerequisites

- ZKTeco K40 device connected to your network
- Device IP address and port (default: 4370)
- Admin access to your application
- Database migration applied

## Step 1: Configure the Device

### 1.1 Connect ZKTeco K40 to Network
1. Power on the ZKTeco K40 device
2. Go to device menu: **Menu → Comm → Ethernet**
3. Configure network settings:
   - IP Address: `192.168.1.201` (or your preferred IP)
   - Subnet Mask: `255.255.255.0`
   - Gateway: Your network gateway
4. Save settings and restart device

### 1.2 Test Device Connection
1. From a computer on the same network, ping the device:
   ```bash
   ping 192.168.1.201
   ```
2. If successful, the device is reachable

## Step 2: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# ZKTeco K40 Configuration
ZKTECO_IP=192.168.1.201
ZKTECO_PORT=4370
ZKTECO_TIMEOUT=5000
ZKTECO_MACHINE_ID=zkteco_k40
BIOMETRIC_SYNC_SECRET=generate-a-strong-random-secret-here

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important:** Generate a strong random secret for `BIOMETRIC_SYNC_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Run Database Migration

Apply the biometric mapping migration:

```bash
# If using Supabase CLI
supabase db push

# Or run the migration file directly in Supabase Dashboard
# File: supabase/migrations/054_biometric_user_mapping.sql
```

This creates two tables:
- `biometric_user_mapping` - Maps system users to device user IDs
- `biometric_sync_log` - Tracks sync operations

## Step 4: Enroll Users in ZKTeco K40

### 4.1 Enroll Fingerprints
1. On the device, go to **Menu → User → New User**
2. Enter User ID (e.g., 1, 2, 3, etc.)
3. Scan fingerprint (recommended: scan 2-3 times for accuracy)
4. Save user

**Important:** Note down the User ID for each employee - you'll need this for mapping.

### 4.2 Alternative: Bulk Enrollment
If you have many users, consider using ZKTeco's desktop software for bulk enrollment.

## Step 5: Map Users in Your System

### 5.1 Access Biometric Settings
1. Log in as Super Admin
2. Go to **Settings → Biometric Mapping** (you'll need to create this UI)
3. For each employee:
   - Select the employee from dropdown
   - Enter their ZKTeco User ID (from Step 4.1)
   - Click "Add Mapping"

### 5.2 Using API (Alternative)
You can also create mappings via API:

```bash
curl -X POST https://yourdomain.com/api/biometric/mapping \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid-of-system-user",
    "machine_user_id": "1"
  }'
```

## Step 6: Test Connection

### 6.1 Test Device Connection
```bash
curl -X POST https://yourdomain.com/api/biometric/test-connection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully connected to ZKTeco K40",
  "deviceInfo": { ... }
}
```

### 6.2 Fetch Device Users
```bash
curl https://yourdomain.com/api/biometric/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

This returns all users enrolled in the device.

## Step 7: Perform Initial Sync

### 7.1 Manual Sync
Trigger the first sync manually:

```bash
curl -X POST https://yourdomain.com/api/biometric/sync \
  -H "Authorization: Bearer BIOMETRIC_SYNC_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Biometric sync completed",
  "data": {
    "recordsFetched": 150,
    "recordsProcessed": 145,
    "recordsFailed": 5,
    "errors": []
  }
}
```

### 7.2 Verify Data
1. Go to **Dashboard → Attendance**
2. Check if attendance records appear
3. Verify check-in/check-out times are correct

## Step 8: Setup Automated Sync

### Option A: Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/biometric/sync",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

This syncs every 10 minutes.

### Option B: External Cron Service

Use services like:
- **Cron-job.org** (free)
- **EasyCron**
- **AWS EventBridge**

Configure to call:
```
POST https://yourdomain.com/api/biometric/sync
Authorization: Bearer YOUR_BIOMETRIC_SYNC_SECRET
```

### Option C: Server Cron Job

If self-hosting, add to crontab:
```bash
*/10 * * * * curl -X POST https://yourdomain.com/api/biometric/sync -H "Authorization: Bearer YOUR_SECRET"
```

## Step 9: Monitor Sync Operations

### 9.1 View Sync Logs
```bash
curl https://yourdomain.com/api/biometric/sync \
  -H "Authorization: Bearer BIOMETRIC_SYNC_SECRET"
```

### 9.2 Check Database
Query sync logs:
```sql
SELECT * FROM biometric_sync_log 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Issue: Cannot connect to device
**Solutions:**
1. Verify device IP and port
2. Check firewall settings
3. Ensure device and server are on same network (or VPN configured)
4. Ping the device to verify network connectivity

### Issue: No records syncing
**Solutions:**
1. Verify user mappings exist
2. Check if users have actually punched in/out on device
3. Review sync logs for errors
4. Ensure device time is synchronized

### Issue: Duplicate records
**Solutions:**
1. The system automatically handles duplicates
2. Check if multiple sync jobs are running
3. Review `biometric_sync_log` for overlapping syncs

### Issue: Wrong timezone
**Solutions:**
1. Set device timezone correctly
2. Configure `APP_TIMEZONE` environment variable
3. Verify server timezone matches your location

## Best Practices

1. **Regular Backups**: Backup device data regularly
2. **User Training**: Train employees on proper fingerprint placement
3. **Monitor Sync**: Check sync logs daily for errors
4. **Fingerprint Quality**: Ensure good fingerprint scans (2-3 scans per finger)
5. **Network Stability**: Ensure stable network connection to device
6. **Access Control**: Keep `BIOMETRIC_SYNC_SECRET` secure
7. **Testing**: Test with a small group before full rollout

## Maintenance

### Weekly Tasks
- Review sync logs for errors
- Verify all employees are mapped correctly
- Check device storage capacity

### Monthly Tasks
- Clean device fingerprint sensor
- Review and update user mappings
- Backup device configuration

### As Needed
- Add new employee mappings
- Remove terminated employee mappings
- Update device firmware (follow ZKTeco guidelines)

## API Reference

### Sync Attendance
```
POST /api/biometric/sync
Authorization: Bearer {BIOMETRIC_SYNC_SECRET}
```

### Test Connection
```
POST /api/biometric/test-connection
Authorization: Bearer {ADMIN_TOKEN}
```

### Get Device Users
```
GET /api/biometric/users
Authorization: Bearer {ADMIN_TOKEN}
```

### Get Sync Logs
```
GET /api/biometric/sync
Authorization: Bearer {BIOMETRIC_SYNC_SECRET}
```

## Support

For issues specific to:
- **ZKTeco Device**: Contact ZKTeco support or refer to device manual
- **Integration Code**: Check application logs and sync logs
- **Network Issues**: Contact your IT department

## Security Notes

1. **Never expose** `BIOMETRIC_SYNC_SECRET` publicly
2. **Restrict access** to biometric API endpoints
3. **Use HTTPS** for all API calls in production
4. **Audit logs** regularly for unauthorized access attempts
5. **Limit network access** to device (firewall rules)

## Next Steps

After successful setup:
1. Create a UI for biometric mapping management
2. Add sync status dashboard
3. Configure email alerts for sync failures
4. Set up monitoring for device connectivity
5. Document your specific user mapping process

---

**Need Help?** Check the application logs and sync logs for detailed error messages.
