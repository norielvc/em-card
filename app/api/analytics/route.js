import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { requireAdmin } from '../../../lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const { count: residentsCount } = await supabase
      .from('ValidResidents')
      .select('*', { count: 'exact', head: true });

    const { count: regCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved');

    // Month-over-month registration counts (approved only)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const { count: thisMonthRegs } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .gte('created_at', thisMonthStart);

    const { count: lastMonthRegs } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .gte('created_at', lastMonthStart)
      .lt('created_at', thisMonthStart);

    // Use PostgreSQL GROUP BY via RPC — single query, no pagination
    const { data: votersByBarangay, error: vErr } = await supabase
      .rpc('get_voters_by_barangay');
    if (vErr) throw vErr;

    // Approved registrations by barangay
    const { data: regsRaw, error: rErr } = await supabase
      .from('registrations')
      .select('barangay')
      .eq('status', 'Approved');
    if (rErr) throw rErr;

    const regMap = {};
    (regsRaw || []).forEach(r => {
      const b = (r.barangay || 'Unknown').trim();
      regMap[b] = (regMap[b] || 0) + 1;
    });
    const regsByBarangay = Object.entries(regMap)
      .map(([barangay, count]) => ({ barangay, count: Number(count) }))
      .sort((a, b) => b.count - a.count);

    // Aid = approved members with at least one scan (received aid at an event)
    const { data: aidData, error: aErr } = await supabase
      .from('registrations')
      .select('barangay')
      .eq('status', 'Approved')
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
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
