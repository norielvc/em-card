const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('c:/Users/SCREENS/OneDrive/Desktop/EM-CARD/.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

const validBarangays = ['DALIG', 'LONGOS', 'PANGINAY', 'PULONG GUBAT', 'SAN JUAN', 'SANTOL', 'WAWA', 'BOROL 2ND', 'Borol 1st', 'BOROL 1ST'];
const inList = '(' + validBarangays.map(b => '"' + b + '"').join(',') + ')';

async function cleanup() {
  const { data, error } = await supabase
    .from('ValidResidents')
    .select('id, barangay, last_name, first_name')
    .not('barangay', 'in', inList);

  if (error) { console.error('Error:', error.message); return; }
  console.log('Found', data?.length || 0, 'invalid rows');

  if (!data || data.length === 0) { console.log('No cleanup needed'); return; }

  data.slice(0, 10).forEach(r => console.log(' ', r.barangay, '|', r.first_name, r.last_name));

  const ids = data.map(r => r.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500);
    const { error: e } = await supabase.from('ValidResidents').delete().in('id', batch);
    if (e) console.error('Delete error:', e.message);
    else { deleted += batch.length; console.log('Deleted', deleted + '/' + ids.length); }
  }
  console.log('Done! Deleted', deleted);
}
cleanup();
