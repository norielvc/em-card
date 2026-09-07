import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request) {
  try {
    // Rate limit: 20 lookups/min per IP
    const rate = rateLimit(request, { max: 20, windowMs: 60 * 1000 });
    if (!rate.allowed) {
      return Response.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const cleanToken = token.trim().replace(/[\r\n\t]/g, '');

    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('id, purok, contact, photo_url, photo_base64, birthday, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
      .eq('qr_token', cleanToken)
      .eq('status', 'Approved')
      .maybeSingle();

    if (regErr || !reg) {
      return Response.json({ error: 'Invalid or unregistered EM Card.' }, { status: 404 });
    }

    const person = reg.ValidResidents || {};
    const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

    // Fetch aid distributions received by this member
    let aidDistributions = [];
    try {
      const { data: distData } = await supabaseAdmin
        .from('aid_distributions')
        .select('id, category, category_name, distributed_at, claim_number, scanned_by')
        .eq('registration_id', reg.id)
        .order('distributed_at', { ascending: false });
      aidDistributions = distData || [];
    } catch {
      // Non-blocking if table not ready
    }

    return Response.json({
      id: reg.id,
      name: fullName,
      barangay: person.barangay || '-',
      purok: reg.purok || '-',
      contact: reg.contact || '-',
      photo: reg.photo_url || reg.photo_base64,
      birthDate: reg.birthday,
      scanCount: reg.scan_count || 0,
      lastScanned: reg.last_scanned_at,
      precinct: person.precinct || null,
      aidDistributions,
    });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
