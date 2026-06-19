import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { requireAdmin } from '../../../lib/security';

// Initialize Supabase with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Provider config loaded at runtime
const semaphoreKey = process.env.SEMAPHORE_API_KEY;

/**
 * Send SMS via Twilio
 */
async function sendTwilio(phone, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phone,
      From: fromNumber,
      Body: body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Twilio error: ${response.status}`);
  }
  return { sid: data.sid, status: data.status };
}

/**
 * Send single SMS via Semaphore
 * Docs: https://semaphore.co/docs
 */
async function _semaphoreCall(apiKey, phone, body, senderName) {
  const params = new URLSearchParams({
    apikey: apiKey,
    number: phone,
    message: body,
  });
  if (senderName) {
    params.append('sendername', senderName);
  }

  const response = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const responseText = await response.text();

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Semaphore returned non-JSON: ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    const errMsg = data?.message || data?.error || `Semaphore HTTP error: ${response.status}`;
    throw new Error(errMsg);
  }

  const isErrorObj = data && !Array.isArray(data) && (data.error || data.status === 'error');
  const isErrorArr = Array.isArray(data) && data.length > 0 && (data[0].error || data[0].status === 'error');

  if (isErrorObj || isErrorArr) {
    const errMsg = data?.message || data?.error || data?.[0]?.message || data?.[0]?.error || 'Semaphore API error';
    throw new Error(errMsg);
  }

  const sid = Array.isArray(data) ? data[0]?.message_id : data?.message_id;
  const status = Array.isArray(data) ? data[0]?.status : data?.status;

  if (!sid) {
    throw new Error(`Unexpected Semaphore response (no message_id): ${JSON.stringify(data).slice(0, 200)}`);
  }

  return { sid, status: status || 'sent', data };
}

/**
 * Send bulk SMS via Semaphore (up to 1000 recipients per call)
 * Uses comma-separated numbers format
 */
async function sendSemaphoreBulk(apiKey, phones, body, senderName) {
  // Check for test mode - simulate bulk send without consuming credits
  if (process.env.SMS_TEST_MODE === 'true') {
    console.log(`[SMS TEST MODE] Would send bulk to ${phones.length} phones`);
    const results = phones.map((phone, i) => ({
      message_id: `test_bulk_${Date.now()}_${i}`,
      status: 'Pending',
      number: phone,
      testMode: true
    }));
    return { results, status: 'sent', testMode: true };
  }

  // Format all phone numbers
  const formattedPhones = phones.map(phone => {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '63' + formatted.slice(1);
    } else if (!formatted.startsWith('63')) {
      formatted = '63' + formatted;
    }
    return formatted;
  }).join(',');

  // Fallback chain: custom sender → no sendername (Semaphore default)
  const sendersToTry = [];
  if (senderName && senderName !== 'SEMAPHORE') sendersToTry.push(senderName);
  sendersToTry.push(null);

  let lastError = null;

  for (const trySender of sendersToTry) {
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        number: formattedPhones,
        message: body,
      });
      if (trySender) {
        params.append('sendername', trySender);
      }

      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Semaphore returned non-JSON: ${responseText.slice(0, 200)}`);
      }

      if (!response.ok) {
        const errMsg = data?.message || data?.error || `Semaphore HTTP error: ${response.status}`;
        throw new Error(errMsg);
      }

      const isErrorObj = data && !Array.isArray(data) && (data.error || data.status === 'error');
      const isErrorArr = Array.isArray(data) && data.length > 0 && (data[0].error || data[0].status === 'error');

      if (isErrorObj || isErrorArr) {
        const errMsg = data?.message || data?.error || data?.[0]?.message || data?.[0]?.error || 'Semaphore API error';
        throw new Error(errMsg);
      }

      return {
        results: Array.isArray(data) ? data : [data],
        status: 'sent'
      };
    } catch (err) {
      lastError = err;
      console.error(`[SMS] Semaphore bulk failed with sender "${trySender || '(default)'}": ${err.message}`);
    }
  }

  throw lastError || new Error('All Semaphore bulk sender options failed');
}

async function sendSemaphore(phone, body) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const customSender = process.env.SEMAPHORE_SENDER_NAME;

  if (!apiKey) {
    throw new Error('Semaphore API key not configured');
  }

  // Format phone for Philippines
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '63' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('63')) {
    formattedPhone = '63' + formattedPhone;
  }

  // Fallback chain: custom sender → no sendername (Semaphore default)
  const sendersToTry = [];
  if (customSender && customSender !== 'SEMAPHORE') sendersToTry.push(customSender);
  sendersToTry.push(null); // no sendername = Semaphore default

  for (const sender of sendersToTry) {
    try {
      const result = await _semaphoreCall(apiKey, formattedPhone, body, sender);
      return { sid: result.sid, status: result.status };
    } catch (err) {
      // silent
    }
  }

  throw new Error('All Semaphore sender options failed. Register a sender name at https://semaphore.co/account#sendernames or check your API key.');
}

/**
 * Send SMS via Mock (for testing without credits)
 */
async function sendMock(phone, body) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500));
  return { sid: 'mock-' + Date.now(), status: 'sent' };
}

/**
 * Determine which provider to use
 */
function getProvider() {
  const providerEnv = process.env.SMS_PROVIDER;
  const hasSemaphoreKey = !!process.env.SEMAPHORE_API_KEY;
  const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID;

  let chosen = null;
  if (providerEnv === 'mock') chosen = 'mock';
  else if (providerEnv === 'semaphore' || hasSemaphoreKey) chosen = 'semaphore';
  else if (hasTwilio) chosen = 'twilio';

  return chosen;
}

/**
 * Send single SMS
 */
async function sendSMS(phone, body) {
  // Check for test mode - simulate send without consuming credits
  if (process.env.SMS_TEST_MODE === 'true') {
    console.log(`[SMS TEST MODE] Would send to 1 phone`);
    return {
      sid: `test_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      status: 'sent',
      testMode: true
    };
  }

  const provider = getProvider();
  if (!provider) {
    throw new Error('No SMS provider configured. Add Twilio or Semaphore credentials.');
  }
  if (provider === 'mock') {
    return sendMock(phone, body);
  }
  if (provider === 'semaphore') {
    return sendSemaphore(phone, body);
  }
  return sendTwilio(phone, body);
}

/**
 * GET - Fetch messages history
 */
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(request.url);

    // Check provider configuration status (no secrets exposed)
    if (searchParams.get('status') === '1') {
      const provider = getProvider();
      return Response.json({
        provider,
        configured: !!provider,
        senderName: process.env.SEMAPHORE_SENDER_NAME || process.env.TWILIO_PHONE_NUMBER || null,
      });
    }

    const messageId = searchParams.get('message_id');

    if (messageId) {
      // Fetch recipients for a specific message
      const { data, error } = await supabase
        .from('message_recipients')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Response.json({ recipients: data || [] });
    }

    // Fetch all messages
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ messages: data || [] });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Send new SMS campaign
 */
export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const body = await request.json();
    const { title, messageBody, type, targetType, targetValue } = body;
    if (!messageBody || !type) {
      return Response.json({ error: 'Message body and type are required' }, { status: 400 });
    }

    // 1. Determine recipients based on target
    let validRecipients = [];

    if (targetType === 'test' && targetValue) {
      // Test mode: send to single phone number
      const phone = targetValue.replace(/\D/g, '');
      if (phone.length < 10) {
        return Response.json({ error: 'Invalid phone number. Use format: 09171234567' }, { status: 400 });
      }
      validRecipients = [{ contact: phone, id: null, resident_id: null, ValidResidents: null }];
    } else if (targetType === 'specific' && targetValue) {
      // Specific user: lookup by registration ID
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, ValidResidents(first_name, last_name, middle_name, suffix)')
        .eq('id', targetValue)
        .single();

      if (regError) {
        return Response.json({ error: 'Database error' }, { status: 500 });
      }
      if (!reg) {
        return Response.json({ error: 'User not found in database' }, { status: 400 });
      }
      if (!reg.contact) {
        return Response.json({ error: 'User has no phone number' }, { status: 400 });
      }
      validRecipients = [reg];
    } else if (targetType === 'birthday' && Array.isArray(targetValue) && targetValue.length > 0) {
      // Birthday: targetValue is array of registration IDs
      const { data: regs, error: regError } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, birthday, ValidResidents(first_name, last_name, middle_name, suffix)')
        .in('id', targetValue)
        .not('contact', 'is', null)
        .neq('contact', '');

      if (regError) throw regError;
      validRecipients = (regs || []).filter(r => r.contact && r.contact.length >= 10);

      if (validRecipients.length === 0) {
        return Response.json({ error: 'No valid birthday recipients found with phone numbers' }, { status: 400 });
      }
    } else {
      let recipientsQuery = supabase.from('registrations').select('id, resident_id, contact, barangay, sector_category, ValidResidents(first_name, last_name, middle_name, suffix)').eq('status', 'Approved');

      if (targetType === 'sector' && targetValue) {
        recipientsQuery = recipientsQuery.eq('sector_category', targetValue);
      } else if (targetType === 'barangay' && targetValue) {
        recipientsQuery = recipientsQuery.eq('barangay', targetValue);
      } else if (targetType === 'leader' && targetValue) {
        // Find registrations where this person is the referrer
        recipientsQuery = recipientsQuery.ilike('referral_name', `%${targetValue}%`);
      }

      const { data: registrations, error: regError } = await recipientsQuery;

      if (regError) throw regError;

      // Filter valid phone numbers
      validRecipients = (registrations || []).filter(r => r.contact && r.contact.length >= 10);

      if (validRecipients.length === 0) {
        return Response.json({ error: 'No valid recipients found with phone numbers' }, { status: 400 });
      }
    }

    // 2. Create message record
    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        title: title || messageBody.slice(0, 50),
        body: messageBody,
        type,
        status: 'sending',
        target_type: targetType || 'all',
        target_value: targetValue,
        total_recipients: validRecipients.length,
        sent_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // 3. Create recipient records
    const recipientInserts = validRecipients.map(reg => {
      const vr = reg.ValidResidents;
      const name = vr ? `${vr.first_name || ''} ${vr.middle_name ? vr.middle_name + ' ' : ''}${vr.last_name || ''}${vr.suffix ? ' ' + vr.suffix : ''}`.trim() : '';
      return {
        message_id: messageRecord.id,
        registration_id: reg.id,
        resident_id: reg.resident_id,
        phone_number: reg.contact,
        resident_name: name,
        status: 'pending',
      };
    });

    const { data: recipientRecords, error: recError } = await supabase
      .from('message_recipients')
      .insert(recipientInserts)
      .select();

    if (recError) throw recError;

    // 4. Send SMS
    const totalRecipients = (recipientRecords || []).length;
    // For small sends (test / 1-10 recipients), send synchronously so user gets immediate feedback.
    // For bulk sends (>10), fire-and-forget with background batch processing.
    let sendResults = null;
    if (totalRecipients <= 10) {
      sendResults = await sendMessagesAsync(messageRecord.id, recipientRecords || [], messageBody, validRecipients);
    } else {
      // For large sends, start background processing and return immediately
      // The status will be updated in the database as batches complete
      sendMessagesAsync(messageRecord.id, recipientRecords || [], messageBody, validRecipients);
    }

    return Response.json({
      success: true,
      messageId: messageRecord.id,
      totalRecipients: validRecipients.length,
      status: sendResults ? (sendResults.failedCount === 0 ? 'sent' : 'partial') : 'sending',
      provider: getProvider(),
      sendResults,
    });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * Background task: send SMS to all recipients
 * Uses Semaphore bulk API (up to 1000 per call) for efficiency
 */
async function sendMessagesAsync(messageId, recipients, body, validRecipients = null) {
  let sentCount = 0;
  let failedCount = 0;
  const results = [];
  const totalRecipients = recipients.length;

  // Configuration for batching - Semaphore supports up to 1000 per API call
  const BULK_BATCH_SIZE = 1000; // Process 1000 SMS per API call
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches (120 calls/min limit)

  console.log(`[SMS] Starting bulk send for ${totalRecipients} recipients`);

  // Check if we can use Semaphore bulk API
  const provider = getProvider();
  const canUseBulk = provider === 'semaphore' && process.env.SEMAPHORE_API_KEY;

  // Update message status to show we're processing
  await supabase
    .from('messages')
    .update({
      status: 'sending',
      sent_count: 0,
      failed_count: 0,
    })
    .eq('id', messageId);

  // Process in batches using bulk API if available
  for (let batchStart = 0; batchStart < totalRecipients; batchStart += BULK_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BULK_BATCH_SIZE, totalRecipients);
    const batch = recipients.slice(batchStart, batchEnd);
    const batchNumber = Math.floor(batchStart / BULK_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalRecipients / BULK_BATCH_SIZE);

    console.log(`[SMS] Processing batch ${batchNumber}/${totalBatches}`);

    try {
      if (canUseBulk) {
        // Use Semaphore bulk API - send up to 1000 at once
        const apiKey = process.env.SEMAPHORE_API_KEY;
        const customSender = process.env.SEMAPHORE_SENDER_NAME;
        const phones = batch.map(r => r.phone_number);

        const bulkResult = await sendSemaphoreBulk(apiKey, phones, body, customSender);

        // Process bulk results and update recipients
        const batchResults = bulkResult.results || [];
        for (let i = 0; i < batch.length; i++) {
          const recipient = batch[i];
          const result = batchResults[i] || { status: 'unknown' };

          if (result.status === 'Pending' || result.status === 'sent') {
            await supabase
              .from('message_recipients')
              .update({
                status: 'sent',
                provider_response: JSON.stringify(result),
                sent_at: new Date().toISOString(),
              })
              .eq('id', recipient.id);
            sentCount++;
          } else {
            await supabase
              .from('message_recipients')
              .update({
                status: 'failed',
                error_message: result.error || 'Bulk send failed',
                sent_at: new Date().toISOString(),
              })
              .eq('id', recipient.id);
            failedCount++;
          }
        }
      } else {
        // Fallback: send one by one (Twilio or other providers)
        for (const recipient of batch) {
          try {
            const result = await sendSMS(recipient.phone_number, body);
            await supabase
              .from('message_recipients')
              .update({
                status: 'sent',
                provider_response: JSON.stringify(result),
                sent_at: new Date().toISOString(),
              })
              .eq('id', recipient.id);
            sentCount++;
          } catch (err) {
            await supabase
              .from('message_recipients')
              .update({
                status: 'failed',
                error_message: err.message,
                sent_at: new Date().toISOString(),
              })
              .eq('id', recipient.id);
            failedCount++;
          }
        }
      }
    } catch (batchError) {
      console.error(`[SMS] Batch ${batchNumber} failed: ${batchError.message}`);
      // Mark all in batch as failed
      for (const recipient of batch) {
        await supabase
          .from('message_recipients')
          .update({
            status: 'failed',
            error_message: batchError.message,
            sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);
        failedCount++;
      }
    }

    // Update progress after each batch
    await supabase
      .from('messages')
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: 'sending',
      })
      .eq('id', messageId);

    console.log(`[SMS] Batch ${batchNumber} complete: ${sentCount} sent, ${failedCount} failed`);

    // Delay between batches (except for the last batch)
    if (batchEnd < totalRecipients) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // Final update
  const finalStatus = failedCount === totalRecipients ? 'failed' : (failedCount > 0 ? 'partial' : 'sent');
  await supabase
    .from('messages')
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  console.log(`[SMS] Send complete: ${sentCount} sent, ${failedCount} failed`);

  return { sentCount, failedCount, results, status: finalStatus };
}
