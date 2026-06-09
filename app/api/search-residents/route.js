import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const excludeId = searchParams.get('excludeId') || '';
  const checkRegistration = searchParams.get('checkRegistration') === 'true';

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  // Filter out particles and very short tokens for FTS
  const particles = new Set(['de', 'la', 'del', 'san', 'santa', 'dos', 'das', 'van', 'von', 'di', 'der', 'den']);
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const dbTokens = tokens.filter((t) => t.length >= 2 && !particles.has(t));
  const searchTokens = dbTokens.length > 0 ? dbTokens : tokens;

  const tsQueryStr = searchTokens.map((t) => `${t}:*`).join(' & ');
  const ilikePattern = `%${q.replace(/\s+/g, '%')}%`;

  const { data: residents, error } = await supabase.rpc('search_residents', {
    ts_query_text: tsQueryStr,
    ilike_pattern: ilikePattern,
    exclude_uuid: excludeId || null,
    result_limit: 50,
  });

  if (error) {
    return NextResponse.json({ data: [] });
  }

  let results = residents || [];

  if (checkRegistration && results.length > 0) {
    const residentIds = results.map((r) => r.id);
    const { data: existingRegs } = await supabase
      .from('registrations')
      .select('resident_id, status')
      .in('resident_id', residentIds)
      .in('status', ['Pending', 'Approved']);

    const registeredIds = new Set((existingRegs || []).map((r) => r.resident_id));
    results = results.map((r) => ({
      ...r,
      hasExistingRegistration: registeredIds.has(r.id),
    }));
  } else {
    results = results.map((r) => ({ ...r, hasExistingRegistration: false }));
  }

  return NextResponse.json({ data: results });
}
