import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const { count: residentsCount } = await supabase
      .from('ValidResidents')
      .select('*', { count: 'exact', head: true });

    const { count: regCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true });

    // Month-over-month registration counts
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const { count: thisMonthRegs } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart);

    const { count: lastMonthRegs } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonthStart)
      .lt('created_at', thisMonthStart);

    // Use PostgreSQL GROUP BY via RPC — single query, no pagination
    const { data: votersByBarangay, error: vErr } = await supabase
      .rpc('get_voters_by_barangay');
    if (vErr) throw vErr;

    const { data: regsByBarangay, error: rErr } = await supabase
      .rpc('get_regs_by_barangay');
    if (rErr) throw rErr;

    // Aid = members with at least one scan (received aid at an event)
    const { data: aidData, error: aErr } = await supabase
      .from('registrations')
      .select('barangay')
      .gt('scan_count', 0);
    if (aErr) throw aErr;

    const aidMap = {};
    (aidData || []).forEach(r => {
      const b = (r.barangay || 'Unknown').trim();
      aidMap[b] = (aidMap[b] || 0) + 1;
    });
    const aidByBarangay = Object.entries(aidMap)
      .map(([barangay, count]) => ({ barangay, count: Number(count) }))
      .sort((a, b) => b.count - a.count);

    return Response.json({
      totalResidents: residentsCount || 0,
      totalRegistrations: regCount || 0,
      thisMonthRegs: thisMonthRegs || 0,
      lastMonthRegs: lastMonthRegs || 0,
      votersByBarangay: votersByBarangay || [],
      regsByBarangay: regsByBarangay || [],
      aidByBarangay,
    });
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
