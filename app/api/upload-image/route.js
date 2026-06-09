import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data, error } = await supabaseAdmin.storage
      .from('event-images')
      .upload(fileName, file, { contentType: 'image/jpeg', upsert: true });

    if (error) throw error;

    const { data: publicUrl } = supabaseAdmin.storage.from('event-images').getPublicUrl(fileName);
    return Response.json({ url: publicUrl.publicUrl });
  } catch (err) {
    return Response.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
