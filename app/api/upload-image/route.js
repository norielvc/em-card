import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Allowed image MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP are allowed.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    // Use crypto-random filename
    const crypto = await import('crypto');
    const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const fileName = `event-${Date.now()}-${randomId}.jpg`;
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
