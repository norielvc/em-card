import { createClient } from '@supabase/supabase-js';
import { compareFaceTokens, extractFaceSignature, compareFaceSignatures } from '../../../../lib/biometrics';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ── Haversine Distance Formula in Meters ──
function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ── Philippines Standard Time (UTC+8 / Asia/Manila) Date & Time Helpers ──
function getManilaDate(date = new Date()) {
  return new Date(date.getTime() + (8 * 60 * 60 * 1000));
}

function toManilaDateString(date = new Date()) {
  const phDate = getManilaDate(date);
  return phDate.toISOString().split('T')[0];
}

function formatManilaTime(date = new Date(), options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  }).format(date);
}

function formatManilaDate(date = new Date(), options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  }).format(date);
}

// Fallback default offices if table is not yet in Supabase
const DEFAULT_OFFICES = [
  {
    id: 'off-hq-01',
    name: 'Main Executive Headquarters',
    code: 'HQ-MAIN',
    address: 'Metropolitan Operations Complex, Metro Manila',
    latitude: 14.6175,
    longitude: 121.0124,
    radius_meters: 150,
    status: 'active',
  },
  {
    id: 'off-east-02',
    name: 'East District Field Hub',
    code: 'DIST-EAST',
    address: 'East Operations Center, Rizal District',
    latitude: 14.5833,
    longitude: 121.0667,
    radius_meters: 250,
    status: 'active',
  },
];

export async function GET() {
  try {
    const todayStr = toManilaDateString(new Date());

    // Fetch all offices so client receives full status (active/inactive)
    let officeList = [];
    try {
      const { data: dbOffices, error: offErr } = await supabaseAdmin
        .from('offices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!offErr && dbOffices && dbOffices.length > 0) {
        officeList = dbOffices;
      } else {
        officeList = DEFAULT_OFFICES;
      }
    } catch (e) {
      officeList = DEFAULT_OFFICES;
    }

    // Fetch enrolled active employees for quick selection / recognition hints
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, first_name, last_name, department, position, photo_url')
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    // Fetch today's recent logs for live activity feed
    const { data: todayLogs } = await supabaseAdmin
      .from('biometric_attendance_logs')
      .select(`
        id,
        employee_id,
        log_date,
        time_in,
        time_out,
        hours_worked,
        status,
        location,
        is_within_geofence,
        distance_meters,
        confidence_score,
        time_in_photo,
        time_out_photo,
        created_at,
        employees (
          first_name,
          last_name,
          department,
          position,
          photo_url
        )
      `)
      .eq('log_date', todayStr)
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({
      success: true,
      offices: officeList,
      employees: employees || [],
      recent_logs: todayLogs || []
    });
  } catch (err) {
    console.error('Public scan GET error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      image,
      mode = 'auto', // 'auto' | 'time_in' | 'time_out'
      latitude,
      longitude,
      employee_id: directEmployeeId,
      confidence = 99.4
    } = body;

    if (!image && !directEmployeeId) {
      return Response.json({ success: false, error: 'Camera frame image is required for biometric face scan.' }, { status: 400 });
    }

    // 1. Mandatory Geofence & Active Office Check
    let allOffices = [];
    try {
      const { data: dbOffices, error: offErr } = await supabaseAdmin
        .from('offices')
        .select('*');
      if (!offErr && dbOffices && dbOffices.length > 0) {
        allOffices = dbOffices;
      } else {
        allOffices = DEFAULT_OFFICES;
      }
    } catch (e) {
      allOffices = DEFAULT_OFFICES;
    }

    const activeOffices = allOffices.filter(o => o.status === 'active');

    // If ALL offices have been disabled/inactive by admin, block recognition immediately!
    if (activeOffices.length === 0) {
      return Response.json({
        success: false,
        error: 'All workplace office locations are currently disabled by administration. Biometric attendance punch is suspended.'
      }, { status: 403 });
    }

    // GPS location is strictly required
    if (!latitude || !longitude) {
      return Response.json({
        success: false,
        error: 'Satellite GPS location is strictly required to verify you are within an authorized office perimeter before punching.'
      }, { status: 403 });
    }

    let minDistance = Infinity;
    let nearestOffice = null;
    let distanceMeters = null;

    for (const off of activeOffices) {
      if (off.latitude && off.longitude) {
        const d = computeDistanceMeters(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(off.latitude),
          parseFloat(off.longitude)
        );
        if (d < minDistance) {
          minDistance = d;
          nearestOffice = off;
          distanceMeters = d;
        }
      }
    }

    if (!nearestOffice) {
      return Response.json({
        success: false,
        error: 'No active office coordinates configured for location validation.'
      }, { status: 403 });
    }

    const allowedRadius = parseInt(nearestOffice.radius_meters, 10) || 100;
    const isWithinGeofence = minDistance <= allowedRadius;
    const locationTag = `${nearestOffice.name} (${distanceMeters}m)`;

    if (!isWithinGeofence) {
      const distFormatted = minDistance >= 1000 ? `${(minDistance / 1000).toFixed(1)}km` : `${minDistance}m`;
      return Response.json({
        success: false,
        error: `Location Restricted: You are ${distFormatted} away from ${nearestOffice.name}. You must be physically within ${allowedRadius}m of the office location to punch attendance.`
      }, { status: 403 });
    }

    // 2. Fetch enrolled active employees
    const { data: allEnrolled, error: listErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('status', 'active');

    if (listErr || !allEnrolled || allEnrolled.length === 0) {
      return Response.json({ success: false, error: 'No registered employees found in system.' }, { status: 404 });
    }

    // 3. 1:N Facial Identification Match
    let emp = null;
    let finalConfidence = parseFloat(confidence) || 99.4;

    if (directEmployeeId) {
      emp = allEnrolled.find(e => e.employee_id === directEmployeeId);
    }

    if (!emp) {
      // Biometric signature matching against all registered face photos / multi-angle samples
      const withFace = allEnrolled.filter(e => e.photo_url || e.face_token || e.face_samples);
      if (withFace.length > 0) {
        const checkScanToken = body.face_token;
        const scanSig = image ? extractFaceSignature(image) : null;
        let bestCandidate = null;
        let bestScore = -1;

        for (const cand of withFace) {
          let maxCandScore = 0;

          // 1. Biometric 256-bit token match
          if (checkScanToken && cand.face_token) {
            const tokenScore = compareFaceTokens(checkScanToken, cand.face_token);
            if (tokenScore > maxCandScore) maxCandScore = tokenScore;
          }

          // 2. Primary photo signature match
          if (scanSig && cand.photo_url) {
            const candSig = extractFaceSignature(cand.photo_url);
            const score = compareFaceSignatures(scanSig, candSig);
            if (score > maxCandScore) maxCandScore = score;
          }

          // 3. Multi-angle samples match
          if (scanSig && cand.face_samples && Array.isArray(cand.face_samples)) {
            for (const sample of cand.face_samples) {
              const sampleSig = extractFaceSignature(sample);
              const score = compareFaceSignatures(scanSig, sampleSig);
              if (score > maxCandScore) maxCandScore = score;
            }
          }

          if (maxCandScore > bestScore) {
            bestScore = maxCandScore;
            bestCandidate = cand;
          }
        }

        if (bestCandidate && bestScore >= 0.50) {
          emp = bestCandidate;
          finalConfidence = (98.0 + (bestScore * 1.8)).toFixed(1);
        } else if (bestCandidate && bestScore >= 0.35) {
          emp = bestCandidate;
          finalConfidence = (97.0 + (bestScore * 1.5)).toFixed(1);
        } else {
          emp = null;
        }
      } else {
        emp = null;
      }
    }

    if (!emp) {
      return Response.json({
        success: false,
        error: 'Face not recognized in biometric database. Please position your face inside the framing guide.'
      }, { status: 404 });
    }

    const employee_id = emp.employee_id;
    const now = new Date();
    const todayStr = toManilaDateString(now);

    // 4. Check existing attendance log for today
    const { data: existingLogs } = await supabaseAdmin
      .from('biometric_attendance_logs')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('log_date', todayStr)
      .limit(1);

    const existing = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    let logRecord = null;
    let punchType = 'time_in';
    let durationFormatted = null;
    let firstInTimeStr = null;

    // ── RULE: FIRST LOG = TIME IN, LAST LOG = TIME OUT ──
    if (!existing || !existing.time_in) {
      // 🟢 FIRST PUNCH OF THE DAY ➔ TIME IN
      punchType = 'time_in';

      const manilaNow = getManilaDate(now);
      const phHours = manilaNow.getUTCHours();
      const phMinutes = manilaNow.getUTCMinutes();
      const punchMinutesOfDay = phHours * 60 + phMinutes;
      const shiftStartMinutes = 9 * 60; // 9:00 AM Manila Time
      let lateMins = 0;
      let status = 'Present';

      if (punchMinutesOfDay > shiftStartMinutes) {
        lateMins = punchMinutesOfDay - shiftStartMinutes;
        if (lateMins > 15) {
          status = 'Late';
        }
      }

      const payload = {
        employee_id,
        log_date: todayStr,
        time_in: now.toISOString(),
        time_in_photo: image || null,
        status,
        late_minutes: lateMins,
        location: locationTag,
        confidence_score: confidence,
        notes: `First Log (Time-In) · ${isWithinGeofence ? 'In Range' : 'Off-site ' + (distanceMeters || 0) + 'm'}`
      };

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from('biometric_attendance_logs')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        logRecord = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from('biometric_attendance_logs')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        logRecord = data;
      }
    } else {
      // 🔴 SUBSEQUENT PUNCH ➔ UPDATE TIME OUT (LAST LOG OF DAY)
      punchType = 'time_out';

      const timeInDate = new Date(existing.time_in);
      firstInTimeStr = formatManilaTime(timeInDate, { hour: '2-digit', minute: '2-digit' });
      const hoursWorked = Math.max(0, (now.getTime() - timeInDate.getTime()) / 3600000);
      const standardHours = emp.daily_hours || 8.0;
      const otHours = Math.max(0, hoursWorked - standardHours);

      const updatePayload = {
        time_out: now.toISOString(),
        time_out_photo: image || existing.time_out_photo || null,
        hours_worked: Math.round(hoursWorked * 100) / 100,
        ot_hours: Math.round(otHours * 100) / 100,
        status: otHours > 0 ? 'Overtime' : existing.status
      };

      const { data, error } = await supabaseAdmin
        .from('biometric_attendance_logs')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      logRecord = data;
      durationFormatted = `${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m`;
    }

    const timeFormatted = formatManilaTime(now, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateFormatted = formatManilaDate(now, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return Response.json({
      success: true,
      action_type: punchType,
      message: punchType === 'time_in'
        ? `Time-In Recorded! (First Log: ${timeFormatted}) · Welcome, ${emp.first_name}!`
        : `Time-Out Updated! (In: ${firstInTimeStr} ➔ Out: ${timeFormatted}) · Total Duty: ${durationFormatted}`,
      employee: {
        id: emp.id,
        employee_id: emp.employee_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        position: emp.position,
        photo_url: emp.photo_url
      },
      log: logRecord,
      time: timeFormatted,
      first_in_time: firstInTimeStr,
      date: dateFormatted,
      duration: durationFormatted,
      is_within_geofence: isWithinGeofence,
      distance_meters: distanceMeters,
      location: locationTag,
      confidence
    });
  } catch (err) {
    console.error('Public scan POST error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
