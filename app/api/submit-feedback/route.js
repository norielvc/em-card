import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req) {
  try {
    // Rate limit: 5 feedback submissions per minute per IP
    const limit = rateLimit(req, { windowMs: 60 * 1000, max: 5 });
    if (!limit.allowed) {
      return Response.json({ error: 'Too many submissions. Please slow down.' }, { status: 429 });
    }

    const body = await req.json();
    const { registration_id, token, type, message } = body;

    if (!registration_id || !message || typeof message !== 'string') {
      return Response.json({ error: 'Registration ID and message are required' }, { status: 400 });
    }

    // Security: verify the token actually belongs to the registration_id
    if (token) {
      const { data: regCheck, error: regErr } = await supabaseAdmin
        .from('registrations')
        .select('qr_token')
        .eq('id', registration_id)
        .maybeSingle();

      if (regErr || !regCheck || regCheck.qr_token !== token) {
        return Response.json({ error: 'Invalid token for this registration' }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('grievances')
      .insert([{
        registration_id,
        token: token || null,
        type: type || 'Feedback',
        message: message.trim().slice(0, 2000), // Max 2000 chars
        status: 'Open',
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, grievance: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
