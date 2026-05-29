import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
async function sendSemaphore(phone, body) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const senderName = process.env.SEMAPHORE_SENDER_NAME || 'SEMAPHORE';

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

  const response = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      number: formattedPhone,
      message: body,
      sendername: senderName,
    }),
  });

  const data = await response.json();
  console.log('[Semaphore] API response:', JSON.stringify(data));

  // Semaphore may return 200 but with error in body
  if (!response.ok) {
    throw new Error(data.message || data.error || `Semaphore HTTP error: ${response.status}`);
  }
  // Check for API-level errors even with 200 status
  if (data && (data.error || data.status === 'error' || data.message === 'Invalid API Key')) {
    throw new Error(data.message || data.error || 'Semaphore API error');
  }

  const sid = data.message_id || (Array.isArray(data) ? data[0]?.message_id : null);
  return { sid: sid || 'unknown', status: data.status || 'sent' };
}

/**
 * Send SMS via Mock (for testing without credits)
 */
async function sendMock(phone, body) {
  console.log(`[MOCK SMS] To: ${phone} | Message: "${body}" | Sender: ${process.env.SEMAPHORE_SENDER_NAME || 'EM_Card'}`);
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500));
  return { sid: 'mock-' + Date.now(), status: 'sent' };
}

/**
 * Determine which provider to use
 */
function getProvider() {
  if (process.env.SMS_PROVIDER === 'mock') {
    return 'mock';
  }
  if (process.env.SMS_PROVIDER === 'semaphore' || process.env.SEMAPHORE_API_KEY) {
    return 'semaphore';
  }
  if (process.env.TWILIO_ACCOUNT_SID) {
    return 'twilio';
  }
  return null;
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
    const { searchParams } = new URL(request.url);
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
      console.log('[API] Looking up specific user by ID:', targetValue);
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, ValidResidents(first_name, last_name, middle_name)')
        .eq('id', targetValue)
        .single();

      if (regError) {
        console.error('[API] Supabase error:', regError);
        return Response.json({ error: `Database error: ${regError.message}` }, { status: 500 });
      }
      if (!reg) {
        console.error('[API] No registration found for ID:', targetValue);
        return Response.json({ error: 'User not found in database' }, { status: 400 });
      }
      if (!reg.contact) {
        console.error('[API] Registration found but no contact:', reg);
        return Response.json({ error: 'User has no phone number' }, { status: 400 });
      }
      console.log('[API] Found user:', reg.ValidResidents, 'phone:', reg.contact);
      validRecipients = [reg];
    } else {
      let recipientsQuery = supabase.from('registrations').select('id, resident_id, contact, barangay, sector_category, ValidResidents(first_name, last_name, middle_name)');

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
      const name = vr ? `${vr.first_name || ''} ${vr.middle_name ? vr.middle_name + ' ' : ''}${vr.last_name || ''}`.trim() : '';
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

    // 4. Send SMS in background (non-blocking)
    // We don't await this - it runs in background
    sendMessagesAsync(messageRecord.id, recipientRecords || [], messageBody);

    return Response.json({
      success: true,
      messageId: messageRecord.id,
      totalRecipients: validRecipients.length,
      status: 'sending',
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Background task: send SMS to all recipients
 */
async function sendMessagesAsync(messageId, recipients, body) {
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendSMS(recipient.phone_number, body);

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
}
