import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';

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
 * Send SMS via Semaphore (Philippines-based, cheaper)
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

  // Semaphore error responses come in many shapes:
  // { message: "Invalid sender name" }
  // { error: "Insufficient balance" }
  // { status: "error", message: "..." }
  // [{ error: "..." }]
  // Success array: [{ message_id: ..., message: "SMS body text", status: "Pending" }]
  // NOTE: data[0].message contains the actual SMS body on success, NOT an error!
  const isErrorObj = data && !Array.isArray(data) && (data.error || data.status === 'error');
  const isErrorArr = Array.isArray(data) && data.length > 0 && (data[0].error || data[0].status === 'error');

  if (isErrorObj || isErrorArr) {
    const errMsg = data?.message || data?.error || data?.[0]?.message || data?.[0]?.error || 'Semaphore API error';
    throw new Error(errMsg);
  }

  // Success: Semaphore returns [{ message_id, status, ... }]
  const sid = Array.isArray(data) ? data[0]?.message_id : data?.message_id;
  const status = Array.isArray(data) ? data[0]?.status : data?.status;

  if (!sid) {
    throw new Error(`Unexpected Semaphore response (no message_id): ${JSON.stringify(data).slice(0, 200)}`);
  }

  return { sid, status: status || 'sent', data };
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST - Send new SMS campaign
 */
export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
        return Response.json({ error: `Database error: ${regError.message}` }, { status: 500 });
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
      let recipientsQuery = supabase.from('registrations').select('id, resident_id, contact, barangay, sector_category, ValidResidents(first_name, last_name, middle_name, suffix)');

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
    // For small sends (test / 1-10 recipients), send synchronously so Vercel
    // doesn't freeze the function before the SMS API call completes.
    // For bulk sends (>10), fire-and-forget with best-effort background send.
    let sendResults = null;
    if (totalRecipients <= 10) {
      sendResults = await sendMessagesAsync(messageRecord.id, recipientRecords || [], messageBody, validRecipients);
    } else {
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
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Background task: send SMS to all recipients
 */
async function sendMessagesAsync(messageId, recipients, body, validRecipients = null) {
  let sentCount = 0;
  let failedCount = 0;
  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    let messageBody = body;

    // Template replacement if validRecipients data provided (birthday personalization)
    if (validRecipients && validRecipients[i]) {
      const firstName = validRecipients[i]?.ValidResidents?.first_name || '';
      messageBody = body.replace(/\{firstName\}/g, firstName);
    }

    try {
      const result = await sendSMS(recipient.phone_number, messageBody);

      // Update recipient status
      await supabase
        .from('message_recipients')
        .update({
          status: 'sent',
          provider_response: JSON.stringify(result),
          sent_at: new Date().toISOString(),
        })
        .eq('id', recipient.id);

      sentCount++;
      results.push({ phone: recipient.phone_number, status: 'sent', result });
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
      results.push({ phone: recipient.phone_number, status: 'failed', error: err.message });
    }
  }

  // Update message summary
  await supabase
    .from('messages')
    .update({
      status: failedCount === recipients.length ? 'failed' : 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  return { sentCount, failedCount, results };
}
