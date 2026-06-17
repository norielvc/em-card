/**
 * Cleanup Orphaned Member Photos from Supabase Storage
 *
 * This script removes photos from the 'member-photos' bucket
 * that no longer have a matching registration record.
 *
 * Usage:
 *   node cleanup-orphan-photos.js
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   in your .env.local file
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual .env.local parser (no dotenv needed)
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BUCKET_NAME = 'member-photos';

async function listAllFiles(bucket, prefix = '') {
  const files = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list(prefix, { limit, offset });

    if (error) {
      console.error('Error listing files:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // It's a file
        files.push(fullPath);
      } else {
        // It's a folder — recurse
        const subFiles = await listAllFiles(bucket, fullPath);
        files.push(...subFiles);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function cleanupOrphanPhotos() {
  console.log('=== Orphaned Photo Cleanup ===\n');

  // 1. Fetch all photo URLs from registrations
  console.log('Fetching photo URLs from registrations...');
  const { data: regs, error: regErr } = await supabase
    .from('registrations')
    .select('photo_url');

  if (regErr) {
    console.error('Failed to fetch registrations:', regErr.message);
    process.exit(1);
  }

  // Build a set of active photo paths
  const activePaths = new Set();
  for (const reg of (regs || [])) {
    if (reg.photo_url && reg.photo_url.includes('/storage/v1/')) {
      try {
        const url = new URL(reg.photo_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('object');
        if (bucketIndex !== -1 && pathParts[bucketIndex + 1] === BUCKET_NAME) {
          const filePath = pathParts.slice(bucketIndex + 2).join('/');
          activePaths.add(filePath);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }

  console.log(`  Active photo references: ${activePaths.size}`);

  // 2. List all files in storage bucket
  console.log(`\nListing all files in '${BUCKET_NAME}' bucket...`);
  const allFiles = await listAllFiles(BUCKET_NAME);
  console.log(`  Total files in bucket: ${allFiles.length}`);

  // 3. Find orphans
  const orphans = allFiles.filter(f => !activePaths.has(f));
  console.log(`  Orphaned files found: ${orphans.length}`);

  if (orphans.length === 0) {
    console.log('\n✓ No orphaned photos found. Storage is clean!');
    return;
  }

  // 4. Show preview (first 10)
  console.log(`\n--- Orphaned files (showing first ${Math.min(orphans.length, 10)} of ${orphans.length}) ---`);
  orphans.slice(0, 10).forEach(f => console.log(`  - ${f}`));
  if (orphans.length > 10) console.log(`  ... and ${orphans.length - 10} more`);

  // 5. Delete in batches
  const BATCH_SIZE = 50;
  let deletedCount = 0;
  let failedCount = 0;

  console.log(`\nDeleting ${orphans.length} orphaned files in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove(batch);

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      failedCount += batch.length;
    } else {
      deletedCount += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: Deleted ${batch.length} files`);
    }
  }

  console.log(`\n=== Cleanup Complete ===`);
  console.log(`  Deleted: ${deletedCount}`);
  console.log(`  Failed:  ${failedCount}`);
  console.log(`  Orphans remaining: ${orphans.length - deletedCount}`);
}

cleanupOrphanPhotos().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
