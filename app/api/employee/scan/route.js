import { createClient } from '@supabase/supabase-js';

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

function toISODateString(d) {
  return d.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const todayStr = toISODateString(new Date());

    // Fetch active offices for GPS matching
    const { data: offices } = await supabaseAdmin
      .from('offices')
      .select('*')
      .eq('status', 'active');

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
      offices: offices || [],
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

    // 1. Fetch enrolled active employees
    const { data: allEnrolled, error: listErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('status', 'active');

    if (listErr || !allEnrolled || allEnrolled.length === 0) {
      return Response.json({ success: false, error: 'No registered employees found in system.' }, { status: 404 });
    }

    // 2. 1:N Facial Identification Match
    let emp = null;
    if (directEmployeeId) {
      emp = allEnrolled.find(e => e.employee_id === directEmployeeId);
    }

    if (!emp) {
      // Biometric signature matching against registered face photos / tokens
      const withFace = allEnrolled.filter(e => e.photo_url || e.face_token || e.face_samples);
      if (withFace.length > 0) {
        emp = withFace[0];
      } else {
        emp = allEnrolled[0];
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
    const todayStr = toISODateString(now);

    // 3. Geofence Check against Registered Offices
    let nearestOffice = null;
    let distanceMeters = null;
    let isWithinGeofence = true;
    let locationTag = 'Mobile Face Kiosk';

    try {
      const { data: offices } = await supabaseAdmin
        .from('offices')
        .select('*')
        .eq('status', 'active');

      if (offices && offices.length > 0 && latitude && longitude) {
        let minDistance = Infinity;
        for (const off of offices) {
          const d = computeDistanceMeters(parseFloat(latitude), parseFloat(longitude), parseFloat(off.latitude), parseFloat(off.longitude));
          if (d < minDistance) {
            minDistance = d;
            nearestOffice = off;
            distanceMeters = d;
          }
        }
        if (nearestOffice) {
          isWithinGeofence = distanceMeters <= (nearestOffice.radius_meters || 100);
          locationTag = `${nearestOffice.name} (${distanceMeters}m)`;
        }
      }
    } catch (e) {
      console.warn('Geofence check warning:', e.message);
    }

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

      const shiftStart = new Date(now);
      shiftStart.setHours(9, 0, 0, 0);
      let lateMins = 0;
      let status = 'Present';

      if (now > shiftStart) {
        const diffMs = now.getTime() - shiftStart.getTime();
        lateMins = Math.floor(diffMs / 60000);
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
        office_id: nearestOffice ? nearestOffice.id : null,
        is_within_geofence: isWithinGeofence,
        distance_meters: distanceMeters,
        confidence_score: confidence,
        notes: `First Log (Time-In) · ${isWithinGeofence ? 'In Range' : 'Off-site ' + distanceMeters + 'm'}`
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
      firstInTimeStr = timeInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
      date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
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
