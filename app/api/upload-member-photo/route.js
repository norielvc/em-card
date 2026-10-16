import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { rateLimit } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Max upload size: 500KB binary (~667KB base64 string)
const MAX_BASE64_LENGTH = 667 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONVALID_RE = /^nonvalid-[a-z0-9-]{2,80}$/i;

function base64ToBlob(base64, contentType = 'image/jpeg') {
  const byteString = atob(base64.split(',')[1] || base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: contentType });
}

async function assertUploadTargetAllowed(residentId, isAuthenticated) {
  if (NONVALID_RE.test(residentId)) {
    // Public registration path for non-COMELEC residents
    return true;
  }

  if (!UUID_RE.test(residentId)) {
    return false;
  }

  const { data: resident } = await supabaseAdmin
    .from('ValidResidents')
    .select('id')
    .eq('id', residentId)
    .maybeSingle();
  if (resident) return true;

  // Admin edit flow uploads with registration id
  if (isAuthenticated) {
    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('id', residentId)
      .maybeSingle();
    if (reg) return true;
  }

  return false;
}

export async function POST(req) {
  try {
    // Rate limit: 8 uploads per minute per IP
    const limit = rateLimit(req, { windowMs: 60 * 1000, max: 8 });
    if (!limit.allowed) {
      return Response.json({ error: 'Too many uploads. Please slow down.' }, { status: 429 });
    }

    const user = await requireAuth(req);
    const isAuthenticated = !!user;

    const { base64, residentId } = await req.json();

    if (!base64 || !residentId) {
      return Response.json(
        { error: 'Missing base64 image or residentId' },
        { status: 400 }
      );
    }

    const id = String(residentId).trim();
    const allowed = await assertUploadTargetAllowed(id, isAuthenticated);
    if (!allowed) {
      return Response.json({ error: 'Invalid or unauthorized upload target' }, { status: 403 });
    }

    // Validate size
    if (base64.length > MAX_BASE64_LENGTH) {
      return Response.json(
        { error: 'Image too large. Maximum size is 500KB.' },
        { status: 413 }
      );
    }

    // Validate base64 data URL format (must be image)
    if (!base64.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/i) && !base64.match(/^[A-Za-z0-9+/=]+$/)) {
      return Response.json(
        { error: 'Invalid image format. Only JPEG, PNG, GIF, WebP are allowed.' },
        { status: 400 }
      );
    }

    const bucketName = 'member-photos';

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some(b => b.name === bucketName);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
      });
    }

    // Convert base64 to Blob and upload
    const blob = base64ToBlob(base64, 'image/jpeg');
    const safeName = id.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80) || 'member';
    const fileName = `${safeName}-${Date.now()}.jpg`;

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrl } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return Response.json({ url: publicUrl.publicUrl });
  } catch (err) {
    return Response.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
