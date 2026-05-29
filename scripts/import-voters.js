const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://azxkcjkbimgigmwggpkj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eGtjamtiaW1naWdtd2dncGtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk1MjE1OCwiZXhwIjoyMDk1NTI4MTU4fQ.uvyJGS_mEQe2KxsC--4PsDBNoRwH3SDCL5WoHQf13DY'
);

const votersDir = path.join(__dirname, '..', 'voters');

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }
  return rows;
}

async function deleteAll(table) {
  let deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (error) {
      console.error(`Error deleting from ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    deleted += data.length;
    console.log(`  Deleted ${deleted} from ${table}...`);
  }
  return deleted;
}

async function importVoters() {
  console.log('Clearing message_recipients (FK dependency)...');
  await deleteAll('message_recipients');

  console.log('Clearing registrations (FK dependency)...');
  await deleteAll('registrations');

  console.log('Clearing ValidResidents table...');
  await deleteAll('ValidResidents');

  // Clean up: delete rows with invalid barangay (parsing artifacts)
  const validBarangays = ['DALIG', 'LONGOS', 'PANGINAY', 'PULONG GUBAT', 'SAN JUAN', 'SANTOL', 'WAWA', 'BOROL 2ND', 'Borol 1st', 'BOROL 1ST'];
  console.log('Removing rows with invalid barangay values...');
  const { error: cleanupError } = await supabase
    .from('ValidResidents')
    .delete()
    .not('barangay', 'in', `("${validBarangays.join('","')}")`);
  if (cleanupError) console.error('Cleanup error:', cleanupError.message);
  else console.log('Cleanup done');

  console.log('All tables cleared. Starting import...');

  const csvFiles = fs.readdirSync(votersDir).filter(f => f.endsWith('.csv'));
  console.log(`Found ${csvFiles.length} CSV files`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const file of csvFiles) {
    const filePath = path.join(votersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    console.log(`\n${file}: ${rows.length} rows`);

    // Map CSV columns to Supabase columns
    const mapped = rows.map(r => ({
      last_name: r['Last Name'] || '',
      first_name: r['First Name'] || '',
      middle_name: r['Middle Name'] || '',
      barangay: r['Barangay'] || '',
      precinct: r['Precinct'] || '',
      status: 'Registered'
    })).filter(r => r.last_name && r.first_name);

    // Insert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('ValidResidents')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  Error inserting batch ${i}-${i + batch.length}:`, error.message);
        totalSkipped += batch.length;
      } else {
        totalInserted += data?.length || 0;
        process.stdout.write(`  Inserted ${totalInserted} total...\r`);
      }
    }
  }

  console.log(`\n\nDone! Total inserted: ${totalInserted}, skipped: ${totalSkipped}`);
}

importVoters().catch(console.error);
