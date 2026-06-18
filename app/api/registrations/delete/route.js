import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';
import { requireAdmin } from '../../../../lib/security';

const supabase = createClient(
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
      return Response.json({ error: 'Missing member id' }, { status: 400 });
    }

    // Fetch member to get photo URL before deletion
    const { data: member } = await supabase
      .from('registrations')
      .select('photo_url')
      .eq('id', id)
      .single();

    // 1. Delete photo from storage if it's a Supabase storage URL
    if (member?.photo_url && member.photo_url.includes('/storage/v1/')) {
      try {
        const url = new URL(member.photo_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('object');
        // URL pattern: /storage/v1/object/public/<bucket>/<path> or /storage/v1/object/sign/<bucket>/<path>
        if (bucketIndex !== -1 && pathParts[bucketIndex + 3]) {
          const bucket = pathParts[bucketIndex + 2];
          const filePath = pathParts.slice(bucketIndex + 3).join('/');
          await supabase.storage.from(bucket).remove([filePath]);
        }
      } catch (storageErr) {
        // Log but don't fail deletion if storage cleanup fails
        console.warn('Failed to delete storage file');
      }
    }

    // 2. Unlink any children first (avoid FK constraint violation)
    const { error: unlinkErr } = await supabase
      .from('registrations')
      .update({ parent_id: null })
      .eq('parent_id', id);
    if (unlinkErr) throw unlinkErr;

    // 3. Delete related message_recipients
    const { error: msgErr } = await supabase
      .from('message_recipients')
      .delete()
      .eq('registration_id', id);
    if (msgErr) throw msgErr;

    // 4. Delete related event_scans
    const { error: scanErr } = await supabase
      .from('event_scans')
      .delete()
      .eq('registration_id', id);
    if (scanErr) throw scanErr;

    // 5. Delete the member
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
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
