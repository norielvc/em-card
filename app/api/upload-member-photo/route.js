import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
    const { base64, residentId } = await req.json();

    if (!base64 || !residentId) {
      return Response.json(
        { error: 'Missing base64 image or residentId' },
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
