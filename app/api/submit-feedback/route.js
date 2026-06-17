import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { registration_id, token, type, message } = body;

    if (!registration_id || !message) {
      return Response.json({ error: 'Registration ID and message are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('grievances')
      .insert([{
        registration_id,
        token,
        type: type || 'Feedback',
        message: message.trim(),
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
