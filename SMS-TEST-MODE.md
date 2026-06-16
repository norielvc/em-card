# SMS Test Mode

## Overview
Test mode allows you to validate your bulk SMS system without consuming credits or actually sending SMS messages.

## How to Enable Test Mode

### Local Development
Add to your `.env.local` file:
```
SMS_TEST_MODE=true
```

### Production (Vercel)
Set environment variable in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `SMS_TEST_MODE` = `true`
3. Redeploy

## What Test Mode Does

✅ **Simulates** SMS sending (logs to console)  
✅ **Updates database** with test status  
✅ **Records** message history  
✅ **Tracks** delivery status (all marked as "sent")  
❌ **Does NOT** call Semaphore API  
❌ **Does NOT** consume SMS credits  
❌ **Does NOT** send real SMS  

## Testing Large Campaigns

### Test 1: Small Batch (3 members)
1. Enable test mode
2. Go to Messages → Compose
3. Select "By Barangay" → BOROL 1ST
4. Send test SMS
5. Check console logs for `[SMS TEST MODE]` messages
6. Check History tab - message should appear with status

### Test 2: Simulating Large Sends (8,000 members)
To test 8,000 recipients without having real members:

1. Temporarily add test recipients to a barangay:
```javascript
// In database or via test script
for (let i = 0; i < 8000; i++) {
  // Insert test member with unique phone
  // Example: 09171230001, 09171230002, etc.
}
```

2. Enable test mode
3. Send SMS to that barangay
4. Verify:
   - Console shows 8 batches of 1,000
   - Database records all 8,000 as "sent"
   - No actual SMS sent (no credits used)

### Test 3: Real Small Test (Recommended)
When ready for real testing:

1. Disable test mode (remove env var)
2. Add 10 test members with your phone numbers:
   - Your phone
   - Family members' phones
   - Staff phones
3. Send real SMS
4. Verify everyone receives the message
5. Check delivery status in History

## Monitoring Test Sends

### Console Logs
Check browser DevTools Console for:
```
[SMS TEST MODE] Would send bulk to 1000 phones: Hello test message...
[SMS] Processing batch 1/8 (1-1000 of 8000)
[SMS] Batch 1 complete. Progress: 1000/8000 sent, 0 failed
```

### Database
Check Supabase → messages table:
- status: 'sent'
- total_recipients: 8000
- sent_count: 8000

Check message_recipients table:
- All records should have status: 'sent'
- provider_response should contain test data

## Switching to Production

1. Remove `SMS_TEST_MODE` environment variable
2. Redeploy
3. Verify real credentials are set:
   - `SEMAPHORE_API_KEY`
   - `SEMAPHORE_SENDER_NAME` (EMcard)

## Troubleshooting

### Issue: Test mode not working
- Check console for errors
- Verify env variable is set correctly
- Restart dev server after adding env var

### Issue: Database not updating
- Check Supabase connection
- Verify RLS policies allow inserts
- Check console for database errors

### Issue: Vercel function timeout on large sends
- Vercel has 5-minute timeout for background functions
- For 40,000+ recipients, use smaller batches or implement queue system

## Safety Checklist Before Production

- [ ] Test mode disabled
- [ ] Semaphore API key valid
- [ ] Sufficient balance for expected volume
- [ ] Sender ID "EMcard" approved
- [ ] Small real test completed (10-20 phones)
- [ ] Delivery status working
- [ ] Rate limits understood (120 calls/min)
