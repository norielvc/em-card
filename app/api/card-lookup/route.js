import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request) {
  try {
    // Rate limit: 20 lookups/min per IP
    const rate = rateLimit(request, { max: 20, windowSeconds: 60 });
    if (rate) return rate;

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const cleanToken = token.trim().replace(/[\r\n\t]/g, '');

    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('id, purok, contact, photo_url, photo_base64, birthday, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay)')
      .eq('qr_token', cleanToken)
      .eq('status', 'Approved')
      .maybeSingle();

    if (regErr || !reg) {
      return Response.json({ error: 'Invalid or unregistered EM Card.' }, { status: 404 });
    }

    const person = reg.ValidResidents || {};
    const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

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
    });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
