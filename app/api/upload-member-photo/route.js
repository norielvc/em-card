import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Max upload size: 500KB binary (~667KB base64 string)
const MAX_BASE64_LENGTH = 667 * 1024;

function base64ToBlob(base64, contentType = 'image/jpeg') {
  const byteString = atob(base64.split(',')[1] || base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: contentType });
}

export async function POST(req) {
  try {
    // Rate limit: 10 uploads per minute per IP
    const limit = rateLimit(req, { windowMs: 60 * 1000, max: 10 });
    if (!limit.allowed) {
      return Response.json({ error: 'Too many uploads. Please slow down.' }, { status: 429 });
    }

    const { base64, residentId } = await req.json();

    if (!base64 || !residentId) {
      return Response.json(
        { error: 'Missing base64 image or residentId' },
        { status: 400 }
      );
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
    const fileName = `${residentId}-${Date.now()}.jpg`;

    const { data, error } = await supabaseAdmin.storage
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
      { error: err.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
