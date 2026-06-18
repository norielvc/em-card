import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { getClientIP } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function cleanToken(rawToken) {
  return rawToken
    .trim()
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s/g, '')
    .replace(/^\uFEFF/, '');
}

function extractTokenFromUrl(cleanToken) {
  const match = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
  return match ? match[1] : cleanToken;
}

function isValidToken(token) {
  return /^(EM[A-Za-z0-9]{24}|EM-\d{10})$/.test(token);
}

async function logAdminAction(action_type, target_table, target_id, target_name, details, admin_email, request) {
  try {
    await supabaseAdmin.from('admin_logs').insert({
      admin_email,
      action_type,
      target_table: target_table || null,
      target_id: target_id || null,
      target_name: target_name || null,
      details: details || {},
      ip_address: request ? getClientIP(request) : null,
    });
  } catch {
    // fire-and-forget: never block scan on logging failure
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rawToken, event_id, scanned_by, household_mode } = body;

    if (!rawToken || !event_id) {
      return Response.json({ error: 'Missing token or event_id' }, { status: 400 });
    }

    // 1. Clean & validate token
    let token = cleanToken(rawToken);
    token = extractTokenFromUrl(token);

    if (!isValidToken(token)) {
      return Response.json({
        type: 'invalid',
        message: 'SECURITY ALERT: Invalid QR format. This is NOT a valid EM Card.',
        rawText: token,
      }, { status: 400 });
    }

    // 2. Fetch event + registration in parallel (independent queries)
    const [
      { data: event, error: eventErr },
      { data: reg, error: regErr },
    ] = await Promise.all([
      supabaseAdmin
        .from('scan_events')
        .select('id, event_name, selected_barangays, household_mode')
        .eq('id', event_id)
        .single(),
      supabaseAdmin
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .eq('qr_token', token)
        .eq('status', 'Approved')
        .maybeSingle(),
    ]);

    if (eventErr || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (regErr || !reg) {
      return Response.json({
        type: 'invalid',
        message: 'SECURITY ALERT: Unregistered or unauthorized EM Card. This QR code is not in our system.',
        rawText: token,
      }, { status: 404 });
    }

    const person = reg.ValidResidents || {};
    const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

    // 4. Barangay restriction check
    const allowedBarangays = event.selected_barangays || [];
    if (Array.isArray(allowedBarangays) && allowedBarangays.length > 0) {
      const memberBarangay = (reg.barangay || person.barangay || '').trim().toUpperCase();
      const normalizedAllowed = allowedBarangays.map(b => (typeof b === 'string' ? b.trim().toUpperCase() : ''));
      if (!normalizedAllowed.includes(memberBarangay)) {
        return Response.json({
          type: 'barangay_restricted',
          name: fullName,
          barangay: reg.barangay || person.barangay || '-',
          purok: reg.purok || person.purok || '-',
          houseNo: reg.house_no || '-',
          contact: reg.contact || '-',
          photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
          emCardNo: reg.em_card_no || '-',
          qrToken: reg.qr_token,
          allowedBarangays: allowedBarangays.join(', '),
        });
      }
    }

    // 5. Check duplicate at this event (event_scans is source of truth)
    const { data: existingScan } = await supabaseAdmin
      .from('event_scans')
      .select('scanned_at, scanned_by')
      .eq('event_id', event_id)
      .eq('registration_id', reg.id)
      .maybeSingle();

    if (existingScan) {
      return Response.json({
        type: 'duplicate',
        name: fullName,
        barangay: person.barangay || '-',
        purok: reg.purok || person.purok || '-',
        houseNo: reg.house_no || '-',
        contact: reg.contact || '-',
        photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
        emCardNo: reg.em_card_no || '-',
        qrToken: reg.qr_token,
        scannedAt: existingScan.scanned_at,
        scannedBy: existingScan.scanned_by,
      });
    }

    // 6. Household duplicate check (if enabled)
    const effectiveHouseholdMode = household_mode !== undefined ? household_mode : event.household_mode;
    if (effectiveHouseholdMode) {
      let householdQuery = supabaseAdmin
        .from('registrations')
        .select('id, house_no, purok, lot, block, phase, barangay, gender, civil_status')
        .eq('barangay', reg.barangay || '');
      if (reg.house_no) householdQuery = householdQuery.eq('house_no', reg.house_no);
      if (reg.purok) householdQuery = householdQuery.eq('purok', reg.purok);
      householdQuery = householdQuery.not('id', 'eq', reg.id);

      const { data: householdMembers } = await householdQuery;
      const householdIds = (householdMembers || []).map(m => m.id);

      if (householdIds.length > 0) {
        const { data: householdScan } = await supabaseAdmin
          .from('event_scans')
          .select('scanned_at, scanned_by, registration_id')
          .eq('event_id', event_id)
          .in('registration_id', householdIds)
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (householdScan) {
          const hhReg = householdMembers.find(m => m.id === householdScan.registration_id);
          const hhPerson = hhReg?.ValidResidents || {};
          const hhName = `${hhPerson.first_name || ''} ${hhPerson.middle_name ? hhPerson.middle_name + ' ' : ''}${hhPerson.last_name || ''}${hhPerson.suffix ? ' ' + hhPerson.suffix : ''}`.trim() || 'Family member';

          return Response.json({
            type: 'household_duplicate',
            name: fullName,
            barangay: person.barangay || '-',
            purok: reg.purok || person.purok || '-',
            houseNo: reg.house_no || '-',
            contact: reg.contact || '-',
            photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
            emCardNo: reg.em_card_no || '-',
            qrToken: reg.qr_token,
            scannedAt: householdScan.scanned_at,
            scannedBy: householdScan.scanned_by,
            claimedBy: hhName,
          });
        }
      }
    }

    // 7. Record the scan in event_scans
    const now = new Date().toISOString();
    const { error: insertErr } = await supabaseAdmin.from('event_scans').insert({
      event_id,
      registration_id: reg.id,
      scanned_by: scanned_by || 'System',
    });

    if (insertErr) {
      // Race condition safety: re-check
      const { data: raceCheck } = await supabaseAdmin
        .from('event_scans')
        .select('scanned_at')
        .eq('event_id', event_id)
        .eq('registration_id', reg.id)
        .maybeSingle();

      if (raceCheck) {
        return Response.json({
          type: 'duplicate',
          name: fullName,
          barangay: person.barangay || '-',
          purok: reg.purok || person.purok || '-',
          houseNo: reg.house_no || '-',
          contact: reg.contact || '-',
          photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
          emCardNo: reg.em_card_no || '-',
          qrToken: reg.qr_token,
          scannedAt: raceCheck.scanned_at,
          scannedBy: 'another staff',
        });
      }
      throw insertErr;
    }

    // 8. Update registration global scan stats (non-blocking — analytics only)
    supabaseAdmin.from('registrations').update({
      last_scanned_at: now,
      scan_count: (reg.scan_count || 0) + 1,
      printed_at: reg.printed_at || now,
    }).eq('id', reg.id).then(() => {}).catch(() => {});

    // 9. Fire admin log in background (never block)
    logAdminAction('scan_event', 'event_scans', reg.id, fullName, { event: event.event_name, em_card_no: reg.em_card_no }, scanned_by, request);

    return Response.json({
      type: 'success',
      name: fullName,
      barangay: person.barangay || '-',
      purok: reg.purok || person.purok || '-',
      houseNo: reg.house_no || '-',
      contact: reg.contact || '-',
      photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
      emCardNo: reg.em_card_no || '-',
      qrToken: reg.qr_token,
      scanCount: (reg.scan_count || 0) + 1,
    });
  } catch (err) {
    return Response.json({ type: 'error', message: err.message || 'Server error' }, { status: 500 });
  }
}
