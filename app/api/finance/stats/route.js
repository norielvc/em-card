import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';
import { requireFinance } from '../../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const today = new Date().toISOString().split('T')[0];

    // 1. Employees count & status
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, base_rate, rate_type, status, department');

    if (empErr) throw empErr;

    const activeEmployees = (employees || []).filter(e => e.status === 'active');
    const inactiveEmployees = (employees || []).filter(e => e.status !== 'active');

    // 2. Today's attendance
    const { data: todayLogs, error: logErr } = await supabaseAdmin
      .from('biometric_attendance_logs')
      .select('id, status, hours_worked, late_minutes, ot_hours')
      .eq('log_date', today);

    if (logErr) throw logErr;

    const presentCount = (todayLogs || []).filter(l => l.status === 'Present' || l.status === 'Overtime').length;
    const lateCount = (todayLogs || []).filter(l => l.status === 'Late').length;
    const totalTodayLogged = (todayLogs || []).length;

    const attendanceRate = activeEmployees.length > 0 
      ? Math.round(((presentCount + lateCount) / activeEmployees.length) * 100) 
      : 0;

    // 3. Estimated Monthly Payroll
    const monthlyLaborCost = activeEmployees.reduce((acc, emp) => {
      const rate = parseFloat(emp.base_rate) || 0;
      if (emp.rate_type === 'hourly') return acc + (rate * 8 * 26);
      if (emp.rate_type === 'daily') return acc + (rate * 26);
      if (emp.rate_type === 'semi_monthly') return acc + (rate * 2);
      return acc + rate;
    }, 0);

    // 4. Department breakdown
    const deptMap = {};
    activeEmployees.forEach(e => {
      const d = e.department || 'General';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });

    return Response.json({
      success: true,
      stats: {
        activeEmployeesCount: activeEmployees.length,
        inactiveEmployeesCount: inactiveEmployees.length,
        todayPresent: presentCount,
        todayLate: lateCount,
        todayAbsent: Math.max(0, activeEmployees.length - totalTodayLogged),
        todayAttendanceRate: attendanceRate,
        estimatedMonthlyLaborCost: Math.round(monthlyLaborCost),
        departmentBreakdown: deptMap,
      },
    });
  } catch (err) {
    console.error('Error fetching finance stats:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
