import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { requireAdmin } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('grievances')
      .select('*, registrations(first_name, last_name, barangay, contact, resident_id, ValidResidents(first_name, last_name, barangay))')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ grievances: data || [] });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await requireAuth(req);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return Response.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('grievances')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ success: true, grievance: data });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
