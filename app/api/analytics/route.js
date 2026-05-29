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

    // Use PostgreSQL GROUP BY via RPC — single query, no pagination
    const { data: votersByBarangay, error: vErr } = await supabase
      .rpc('get_voters_by_barangay');
    if (vErr) throw vErr;

    const { data: regsByBarangay, error: rErr } = await supabase
      .rpc('get_regs_by_barangay');
    if (rErr) throw rErr;

    return Response.json({
      totalResidents: residentsCount || 0,
      totalRegistrations: regCount || 0,
      votersByBarangay: votersByBarangay || [],
      regsByBarangay: regsByBarangay || [],
    });
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
