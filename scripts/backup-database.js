/**
 * EM-CARD Database Backup Script
 *
 * Exports all database tables to local timestamped JSON & CSV files.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS and read all records.
 *
 * Run with: npm run backup-db
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local without external dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ ERROR: .env.local file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// All project tables
const TABLES_TO_BACKUP = [
  'registrations',
  'ValidResidents',
  'scan_events',
  'event_scans',
  'upcoming_events',
  'contact_inquiries',
  'admin_users',
  'organizations',
  'organization_members',
  'aid_distributions',
  'admin_audit_logs',
  'grievances',
  'employees',
  'biometric_attendance_logs',
  'employee_leaves',
  'payroll_records',
  'payroll_runs',
  'payroll_adjustments'
];

// Helper: Convert array of objects to CSV string
function jsonToCsv(items) {
  if (!items || items.length === 0) return '';
  const headers = Array.from(
    items.reduce((keys, item) => {
      Object.keys(item || {}).forEach(k => keys.add(k));
      return keys;
    }, new Set())
  );

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') val = JSON.stringify(val);
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.join(',')];
  for (const row of items) {
    csvRows.push(headers.map(h => escapeCell(row[h])).join(','));
  }
  return csvRows.join('\n');
}

async function fetchTableData(tableName) {
  const CHUNK_SIZE = 1000;
  let allRows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + CHUNK_SIZE - 1);

    if (error) {
      // Table might not exist or error occurred
      return { error: error.message, rows: [] };
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      if (data.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        from += CHUNK_SIZE;
      }
    }
  }

  return { error: null, rows: allRows };
}

async function runBackup() {
  const startTime = Date.now();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDirName = `backup-${dateStr}`;
  const backupDirPath = path.resolve(__dirname, '..', 'backups', backupDirName);

  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }

  console.log('\n📦 ============================================');
  console.log('   EM-CARD DATABASE BACKUP INITIATED');
  console.log('   Target Directory: /backups/' + backupDirName);
  console.log('   Timestamp: ' + new Date().toLocaleString());
  console.log('============================================\n');

  const summary = {
    timestamp: new Date().toISOString(),
    supabaseUrl: supabaseUrl,
    tables: {},
    totalRows: 0,
    durationMs: 0
  };

  let totalCount = 0;

  for (const table of TABLES_TO_BACKUP) {
    process.stdout.write(`  ⏳ Backing up table: ${table.padEnd(28)} `);
    const { error, rows } = await fetchTableData(table);

    if (error) {
      console.log(`⚠️  [Skipped / ${error}]`);
      summary.tables[table] = { status: 'skipped', error };
      continue;
    }

    const count = rows.length;
    totalCount += count;

    // Save JSON
    const jsonPath = path.join(backupDirPath, `${table}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf8');

    // Save CSV
    const csvContent = jsonToCsv(rows);
    const csvPath = path.join(backupDirPath, `${table}.csv`);
    fs.writeFileSync(csvPath, csvContent, 'utf8');

    console.log(`✅  ${count.toString().padStart(6)} rows saved`);
    summary.tables[table] = { status: 'success', rowCount: count };
  }

  summary.totalRows = totalCount;
  summary.durationMs = Date.now() - startTime;

  // Save manifest summary
  fs.writeFileSync(
    path.join(backupDirPath, 'backup_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log('\n============================================');
  console.log(`🎉 BACKUP COMPLETE in ${(summary.durationMs / 1000).toFixed(2)}s!`);
  console.log(`📊 Total Records Saved: ${totalCount}`);
  console.log(`📁 Files saved to: backups/${backupDirName}`);
  console.log('============================================\n');
}

runBackup().catch(err => {
  console.error('\n❌ Backup failed with error:', err);
  process.exit(1);
});
