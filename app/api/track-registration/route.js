import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { reference } = await request.json();

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ found: false, message: 'Reference number is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('registrations')
      .select('id, reference_no, status, created_at, printed_at, em_card_no, qr_token, first_name, middle_name, last_name, suffix, barangay, photo_url, ValidResidents(first_name, middle_name, last_name, suffix, barangay)')
      .eq('reference_no', reference.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false, message: 'Registration not found' }, { status: 404 });
    }

    const vr = data.ValidResidents || {};
    const firstName = vr.first_name || data.first_name || '';
    const middleName = vr.middle_name || data.middle_name || '';
    const lastName = vr.last_name || data.last_name || '';
    const suffix = vr.suffix || data.suffix || '';
    const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}${suffix ? ' ' + suffix : ''}`.trim();

    return NextResponse.json({
      found: true,
      data: {
        id: data.id,
        status: data.status,
        createdAt: data.created_at,
        printedAt: data.printed_at,
        emCardNo: data.em_card_no,
        name: fullName || '—',
        barangay: (vr.barangay || data.barangay || '—').toString().trim(),
        photoUrl: data.photo_url || null,
      }
    });
  } catch (err) {
    return NextResponse.json({ found: false, message: 'Server error' }, { status: 500 });
  }
}
