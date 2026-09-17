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

// ── Helper to format dates to YYYY-MM-DD ──
function toISODateString(d) {
  return d.toISOString().split('T')[0];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    if (!employeeId) {
      return Response.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });
    }

    const todayStr = toISODateString(new Date());

    // 1. Fetch Employee Profile
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (empErr || !employee) {
      return Response.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    // 2. Fetch Active Offices for GPS matching
    const { data: offices } = await supabaseAdmin
      .from('offices')
      .select('*')
      .eq('status', 'active');

    // 3. Fetch Today's Attendance Log
    const { data: todayLogs } = await supabaseAdmin
      .from('biometric_attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('log_date', todayStr)
      .limit(1);

    const todayAttendance = todayLogs && todayLogs.length > 0 ? todayLogs[0] : null;

    // 4. Determine Current Cut-off Window (1-15 or 16-EOM)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    let cutoffStartStr, cutoffEndStr;

    if (currentDay <= 15) {
      cutoffStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      cutoffEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
    } else {
      cutoffStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-16`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      cutoffEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
    }

    // 5. Fetch Attendance Logs for Current Cut-off & Recent 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toISODateString(thirtyDaysAgo);

    const { data: recentLogs } = await supabaseAdmin
      .from('biometric_attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('log_date', thirtyDaysAgoStr)
      .order('log_date', { ascending: false });

    // Filter current cutoff logs
    const cutoffLogs = (recentLogs || []).filter(
      l => l.log_date >= cutoffStartStr && l.log_date <= cutoffEndStr
    );

    // Compute Cut-off KPIs
    let totalCutoffHours = 0;
    let totalCutoffOT = 0;
    let daysWorkedCount = 0;
    let lateMinutesCount = 0;

    cutoffLogs.forEach(log => {
      if (log.time_in) {
        daysWorkedCount++;
        totalCutoffHours += parseFloat(log.hours_worked || 0);
        totalCutoffOT += parseFloat(log.ot_hours || 0);
        lateMinutesCount += parseInt(log.late_minutes || 0, 10);
      }
    });

    // 6. Fetch Payslips for this Employee
    const { data: payslips } = await supabaseAdmin
      .from('payroll_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('cutoff_start', { ascending: false })
      .limit(12);

    // 7. Fetch Active Loans & Adjustments
    const { data: adjustments } = await supabaseAdmin
      .from('payroll_adjustments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active');

    // 8. 13th Month Projected Earnings (YTD basic sum / 12)
    const currentYearStart = `${currentYear}-01-01`;
    const { data: ytdPayrolls } = await supabaseAdmin
      .from('payroll_records')
      .select('basic_pay')
      .eq('employee_id', employeeId)
      .gte('cutoff_start', currentYearStart);

    const totalYtdBasic = (ytdPayrolls || []).reduce((sum, p) => sum + parseFloat(p.basic_pay || 0), 0);
    const projected13thMonth = Math.round((totalYtdBasic / 12) * 100) / 100;

    return Response.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          full_name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          position: employee.position,
          photo_url: employee.photo_url,
          rate_type: employee.rate_type,
          base_rate: employee.base_rate,
          allowance: employee.allowance,
          tin_number: employee.tin_number,
          sss_number: employee.sss_number,
          philhealth_number: employee.philhealth_number,
          pagibig_number: employee.pagibig_number,
          bank_name: employee.bank_name,
          bank_account_no: employee.bank_account_no,
          hire_date: employee.hire_date
        },
        offices: offices || [],
        today: {
          date: todayStr,
          attendance: todayAttendance,
          has_clocked_in: Boolean(todayAttendance && todayAttendance.time_in),
          has_clocked_out: Boolean(todayAttendance && todayAttendance.time_out),
          current_status: todayAttendance?.status || 'Not Clocked In'
        },
        cutoff: {
          start: cutoffStartStr,
          end: cutoffEndStr,
          days_worked: daysWorkedCount,
          total_hours: Math.round(totalCutoffHours * 10) / 10,
          total_ot_hours: Math.round(totalCutoffOT * 10) / 10,
          total_late_mins: lateMinutesCount,
          logs: cutoffLogs
        },
        recent_logs: recentLogs || [],
        payslips: payslips || [],
        adjustments: adjustments || [],
        projected_13th_month: projected13thMonth
      }
    });
  } catch (err) {
    console.error('Employee portal GET error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'clock_punch', employee_id } = body;

    if (!employee_id) {
      return Response.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });
    }

    // Fetch Employee
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employee_id', employee_id)
      .single();

    if (empErr || !employee) {
      return Response.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    // ── CASE 1: MOBILE CELLPHONE CLOCK-IN / CLOCK-OUT PUNCH ──
    if (action === 'clock_punch') {
      const {
        type = 'time_in', // 'time_in' | 'time_out'
        latitude,
        longitude,
        selfie_image,
        notes = ''
      } = body;

      const now = new Date();
      const todayStr = toISODateString(now);

      // 1. Geofence & Location Validation against configured Offices
      let nearestOffice = null;
      let minDistance = null;
      let isWithinGeofence = true;
      let officeName = 'Mobile Device GPS';

      if (latitude && longitude) {
        const { data: offices } = await supabaseAdmin
          .from('offices')
          .select('*')
          .eq('status', 'active');

        if (offices && offices.length > 0) {
          offices.forEach((off) => {
            const dist = computeDistanceMeters(latitude, longitude, parseFloat(off.latitude), parseFloat(off.longitude));
            if (minDistance === null || dist < minDistance) {
              minDistance = dist;
              nearestOffice = off;
            }
          });

          if (nearestOffice) {
            const allowedRadius = nearestOffice.radius_meters || 100;
            isWithinGeofence = minDistance <= allowedRadius;
            officeName = `${nearestOffice.name} (${minDistance}m)`;
          }
        }
      }

      // Check existing log for today
      const { data: existingLogs } = await supabaseAdmin
        .from('biometric_attendance_logs')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('log_date', todayStr)
        .limit(1);

      const existing = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

      let logRecord = null;

      if (type === 'time_in') {
        if (existing && existing.time_in) {
          return Response.json({
            success: false,
            error: `You have already clocked in today at ${new Date(existing.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          }, { status: 400 });
        }

        // Calculate Late Minutes (Assuming standard 9:00 AM shift)
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
          time_in_photo: selfie_image || null,
          status,
          late_minutes: lateMins,
          location: officeName,
          office_id: nearestOffice ? nearestOffice.id : null,
          is_within_geofence: isWithinGeofence,
          distance_meters: minDistance,
          confidence_score: 99.5,
          notes: notes || `Mobile Clock-In (${isWithinGeofence ? 'Within Range' : 'Off-site: ' + minDistance + 'm'})`
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

        return Response.json({
          success: true,
          action_type: 'time_in',
          message: `Good day, ${employee.first_name}! Time-in recorded successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          log: logRecord,
          is_within_geofence: isWithinGeofence,
          distance_meters: minDistance,
          office_name: officeName
        });
      } else {
        // TIME OUT
        if (!existing || !existing.time_in) {
          return Response.json({
            success: false,
            error: 'You cannot clock out without clocking in first today.'
          }, { status: 400 });
        }

        const timeInDate = new Date(existing.time_in);
        const hoursWorked = Math.max(0, (now.getTime() - timeInDate.getTime()) / 3600000);
        const standardHours = employee.daily_hours || 8.0;
        const otHours = Math.max(0, hoursWorked - standardHours);

        const updatePayload = {
          time_out: now.toISOString(),
          time_out_photo: selfie_image || null,
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

        const durationFormatted = `${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m`;

        return Response.json({
          success: true,
          action_type: 'time_out',
          message: `Great work today, ${employee.first_name}! Time-out recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total duty: ${durationFormatted}.`,
          log: logRecord,
          hours_worked: logRecord.hours_worked,
          ot_hours: logRecord.ot_hours,
          duration: durationFormatted
        });
      }
    }

    return Response.json({ success: false, error: 'Invalid action requested.' }, { status: 400 });
  } catch (err) {
    console.error('Employee portal POST error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
