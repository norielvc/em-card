import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Public registration helpers (service role).
 * Keeps citizen signup working after ValidResidents/registrations RLS is tightened.
 *
 * POST body:
 *  { action: 'check_duplicate', residentId }
 *  { action: 'resolve_parent', referralName }
 *  { action: 'mark_registered', residentId }
 */
export async function POST(request) {
  try {
    const limit = rateLimit(request, { windowMs: 60 * 1000, max: 40 });
    if (!limit.allowed) {
      return Response.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const body = await request.json();
    const action = body?.action;

    if (action === 'check_duplicate') {
      const residentId = String(body.residentId || '').trim();
      if (!UUID_RE.test(residentId)) {
        return Response.json({ error: 'Invalid residentId' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('registrations')
        .select('id, status')
        .eq('resident_id', residentId)
        .in('status', ['Pending', 'Approved'])
        .maybeSingle();

      if (error) {
        return Response.json({ error: 'Lookup failed' }, { status: 500 });
      }

      return Response.json({
        exists: !!data,
        status: data?.status || null,
        id: data?.id || null,
      });
    }

    if (action === 'resolve_parent') {
      const referralName = String(body.referralName || '').trim();
      if (!referralName || referralName.length < 3) {
        return Response.json({ parentId: null });
      }

      const needle = referralName.toLowerCase();

      // Prefer approved members with linked ValidResidents name match
      const { data: approved, error } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, middle_name, last_name, suffix, ValidResidents(first_name, last_name, middle_name, suffix)')
        .eq('status', 'Approved')
        .limit(500);

      if (error) {
        return Response.json({ parentId: null });
      }

      const match = (approved || []).find((p) => {
        const vr = p.ValidResidents;
        const fromVr = vr
          ? `${vr.first_name || ''} ${vr.middle_name ? vr.middle_name + ' ' : ''}${vr.last_name || ''}${vr.suffix ? ' ' + vr.suffix : ''}`.trim()
          : '';
        const fromReg = `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim();
        const name = (fromVr || fromReg).toLowerCase();
        return name && name === needle;
      });

      return Response.json({ parentId: match?.id || null });
    }

    if (action === 'mark_registered') {
      const residentId = String(body.residentId || '').trim();
      if (!UUID_RE.test(residentId)) {
        return Response.json({ error: 'Invalid residentId' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('ValidResidents')
        .update({ status: 'Registered' })
        .eq('id', residentId);

      if (error) {
        return Response.json({ error: 'Update failed' }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
