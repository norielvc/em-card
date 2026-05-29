const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://azxkcjkbimgigmwggpkj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eGtjamtiaW1naWdtd2dncGtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk5NTIxNTgsImV4cCI6MjA5NTUyODE1OH0.uvyJGS_mEQe2KxsC--4PsDBNoRwH3SDCL5WoHQf13DY'
);

const validBarangays = ['DALIG', 'LONGOS', 'PANGINAY', 'PULONG GUBAT', 'SAN JUAN', 'SANTOL', 'WAWA', 'BOROL 2ND', 'Borol 1st', 'BOROL 1ST'];

async function cleanup() {
  console.log('Finding invalid barangay rows...');

  // Get all rows with invalid barangay (not in valid list)
  const { data, error } = await supabase
    .from('ValidResidents')
    .select('id, barangay, last_name, first_name')
    .not('barangay', 'in', `("${validBarangays.join('","')}")`);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${data?.length || 0} rows with invalid barangay`);

  if (!data || data.length === 0) {
    console.log('No cleanup needed!');
    return;
  }

  // Show sample
  console.log('Sample invalid rows:');
  data.slice(0, 10).forEach(r => {
    console.log(`  ID: ${r.id.slice(0,8)} | Barangay: "${r.barangay}" | Name: ${r.first_name} ${r.last_name}`);
  });

  // Delete them in batches
  const ids = data.map(r => r.id);
  const batchSize = 500;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error: delError } = await supabase
      .from('ValidResidents')
      .delete()
      .in('id', batch);

    if (delError) {
      console.error(`Delete error:`, delError.message);
    } else {
      deleted += batch.length;
      console.log(`Deleted ${deleted}/${ids.length}...`);
    }
  }

  console.log(`Cleanup complete! Deleted ${deleted} invalid rows.`);
}

cleanup().catch(console.error);
