import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: 'Missing member id' }, { status: 400 });
    }

    // 1. Unlink any children first (avoid FK constraint violation)
    const { error: unlinkErr } = await supabase
      .from('registrations')
      .update({ parent_id: null })
      .eq('parent_id', id);
    if (unlinkErr) throw unlinkErr;

    // 2. Delete the member
    const { data, error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return Response.json({ error: 'No rows deleted' }, { status: 404 });
    }

    return Response.json({ success: true, deleted: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
