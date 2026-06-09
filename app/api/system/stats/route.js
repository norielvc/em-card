import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SERVICE_ROLE_KEY || ''
);

async function listAllFiles(bucketName, prefix = '') {
  const listRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${bucketName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    return { files: [], error: `List failed for ${bucketName}/${prefix}: ${errText}` };
  }

  const listData = await listRes.json();
  // Response can be a direct array or wrapped in data
  const items = Array.isArray(listData) ? listData : (listData.data || []);

  let files = [];
  let folders = [];

  for (const item of items) {
    if (!item.name) continue;
    if (item.name.endsWith('/')) {
      // It's a folder
      folders.push(item.name);
    } else {
      // It's a file (has metadata or doesn't end with /)
      files.push(item);
    }
  }

  // Recursively list folders
  for (const folder of folders) {
    const sub = await listAllFiles(bucketName, folder);
    files = files.concat(sub.files);
  }

  return { files, error: null };
}

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing Supabase URL or service role key' },
      { status: 500 }
    );
  }

  try {
    // 1. List buckets via Storage REST API
    const bucketsRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!bucketsRes.ok) {
      const err = await bucketsRes.text();
      return NextResponse.json({ error: `Buckets fetch failed: ${err}` }, { status: 500 });
    }

    const buckets = await bucketsRes.json();

    // 2. List files in each bucket (recursively)
    const bucketDetails = await Promise.all(
      buckets.map(async (bucket) => {
        const { files, error: listError } = await listAllFiles(bucket.name);

        const fileCount = files.length;
        const size = files.reduce((sum, f) => {
          const fileSize = f.metadata?.size || f.size || 0;
          return sum + fileSize;
        }, 0);

        return {
          id: bucket.id,
          name: bucket.name,
          public: bucket.public,
          fileCount,
          size,
          listError,
        };
      })
    );

    const totalUsedBytes = bucketDetails.reduce((sum, b) => sum + b.size, 0);
    const totalFileCount = bucketDetails.reduce((sum, b) => sum + b.fileCount, 0);

    // 3. Get database table sizes via RPC
    let dbSizes = [];
    let dbSizeError = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('get_table_sizes');
      if (error) throw error;
      dbSizes = data || [];
    } catch (err) {
      dbSizeError = err.message || 'Failed to fetch DB table sizes';
    }

    const totalDbSize = dbSizes.reduce((sum, t) => sum + (t.size_bytes || 0), 0);

    return NextResponse.json({
      buckets: bucketDetails,
      totalUsedBytes,
      totalFileCount,
      dbSizes,
      dbSizeError,
      totalDbSize,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
