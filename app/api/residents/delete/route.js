import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';
import { requireAdmin } from '../../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: 'Missing resident id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ValidResidents')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return Response.json({ error: 'No rows deleted' }, { status: 404 });
    }

    return Response.json({ success: true, deleted: data });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
