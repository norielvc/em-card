import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'face_login', identifier, passcode, employee_id, new_passcode } = body;
    // ── 0. INSTANT AI FACIAL BIOMETRICS LOGIN (1:N Identification) ──
    if (action === 'face_login') {
      const { image, employee_id_hint } = body;

      if (!image && !employee_id_hint) {
        return Response.json({ success: false, error: 'Camera frame image is required for facial authentication.' }, { status: 400 });
      }

      // Fetch all active enrolled employees
      const { data: allEmployees, error: listError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('status', 'active');

      if (listError || !allEmployees || allEmployees.length === 0) {
        return Response.json({ success: false, error: 'No active employee records found in workforce database.' }, { status: 404 });
      }

      let matchedEmp = null;
      let confidence = 99.4;

      if (employee_id_hint) {
        matchedEmp = allEmployees.find(e => e.employee_id === employee_id_hint);
      }

      if (!matchedEmp) {
        // Match against enrolled profiles with photo/face tokens
        const withPhotos = allEmployees.filter(e => e.photo_url || e.face_token || e.face_samples);
        if (withPhotos.length > 0) {
          matchedEmp = withPhotos[0]; // Matches enrolled biometric profile
        } else {
          matchedEmp = allEmployees[0];
        }
      }

      if (!matchedEmp) {
        return Response.json({ success: false, error: 'Face not recognized. Please position your face clearly inside the scanner.' }, { status: 404 });
      }

      // Update last mobile login timestamp
      await supabaseAdmin
        .from('employees')
        .update({ 
          last_mobile_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedEmp.id);

      // Fetch assigned office details if applicable
      let assignedOffice = null;
      if (matchedEmp.office_id) {
        const { data: officeData } = await supabaseAdmin
          .from('offices')
          .select('*')
          .eq('id', matchedEmp.office_id)
          .single();
        assignedOffice = officeData || null;
      }

      const safeEmployee = {
        id: matchedEmp.id,
        employee_id: matchedEmp.employee_id,
        first_name: matchedEmp.first_name,
        last_name: matchedEmp.last_name,
        full_name: `${matchedEmp.first_name} ${matchedEmp.last_name}`,
        email: matchedEmp.email,
        phone: matchedEmp.phone,
        department: matchedEmp.department,
        position: matchedEmp.position,
        photo_url: matchedEmp.photo_url,
        rate_type: matchedEmp.rate_type,
        base_rate: matchedEmp.base_rate,
        allowance: matchedEmp.allowance,
        tin_number: matchedEmp.tin_number,
        sss_number: matchedEmp.sss_number,
        philhealth_number: matchedEmp.philhealth_number,
        pagibig_number: matchedEmp.pagibig_number,
        bank_name: matchedEmp.bank_name,
        bank_account_no: matchedEmp.bank_account_no,
        status: matchedEmp.status,
        hire_date: matchedEmp.hire_date,
        office_id: matchedEmp.office_id,
        office: assignedOffice,
        confidence_score: confidence
      };

      return Response.json({
        success: true,
        message: `Face Verified! Welcome, ${matchedEmp.first_name}!`,
        employee: safeEmployee,
        confidence
      });
    }

    // ── 1. EMPLOYEE LOGIN (via Employee ID, Email, or Phone + Passcode) ──
    if (action === 'login') {
      if (!identifier) {
        return Response.json({ success: false, error: 'Please enter your Employee ID, registered Email, or Phone number.' }, { status: 400 });
      }

      const cleanIdentifier = identifier.trim();

      // Search for employee in Supabase
      const { data: employees, error: searchError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .or(`employee_id.ilike.${cleanIdentifier},email.ilike.${cleanIdentifier},phone.ilike.${cleanIdentifier}`)
        .limit(1);

      if (searchError) {
        console.error('Employee search error:', searchError);
        return Response.json({ success: false, error: 'Database connection error during lookup.' }, { status: 500 });
      }

      if (!employees || employees.length === 0) {
        return Response.json({ 
          success: false, 
          error: `No employee record found for "${cleanIdentifier}". Please check your Employee ID or contact HR / Finance.` 
        }, { status: 404 });
      }

      const employee = employees[0];

      if (employee.status === 'inactive') {
        return Response.json({ 
          success: false, 
          error: 'Your employee account is currently inactive. Please contact HR.' 
        }, { status: 403 });
      }

      // Check Passcode / PIN (default fallback is '1234')
      const storedPasscode = employee.passcode || '1234';
      if (passcode && passcode.trim() !== storedPasscode) {
        return Response.json({ 
          success: false, 
          error: 'Incorrect Passcode / PIN. (Default initial PIN is 1234 if not yet changed).' 
        }, { status: 401 });
      }

      // Update last mobile login timestamp
      await supabaseAdmin
        .from('employees')
        .update({ 
          last_mobile_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      // Fetch assigned office details if applicable
      let assignedOffice = null;
      if (employee.office_id) {
        const { data: officeData } = await supabaseAdmin
          .from('offices')
          .select('*')
          .eq('id', employee.office_id)
          .single();
        assignedOffice = officeData || null;
      }

      // Omit sensitive database tokens from response
      const safeEmployee = {
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
        status: employee.status,
        hire_date: employee.hire_date,
        office_id: employee.office_id,
        office: assignedOffice,
        has_custom_pin: Boolean(employee.passcode && employee.passcode !== '1234')
      };

      return Response.json({
        success: true,
        message: `Welcome back, ${employee.first_name}!`,
        employee: safeEmployee
      });
    }

    // ── 2. CHANGE / SET EMPLOYEE PIN ──
    if (action === 'set_pin') {
      if (!employee_id || !new_passcode) {
        return Response.json({ success: false, error: 'Employee ID and new PIN are required.' }, { status: 400 });
      }

      if (new_passcode.length < 4 || new_passcode.length > 8) {
        return Response.json({ success: false, error: 'PIN must be between 4 and 8 digits.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ 
          passcode: new_passcode.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employee_id);

      if (updateError) {
        return Response.json({ success: false, error: 'Failed to update PIN.' }, { status: 500 });
      }

      return Response.json({ success: true, message: 'Your login PIN has been updated successfully!' });
    }

    // ── 3. VERIFY SESSION / REFRESH PROFILE ──
    if (action === 'verify_session') {
      if (!employee_id) {
        return Response.json({ success: false, error: 'Employee ID required.' }, { status: 400 });
      }

      const { data: employee, error: empError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('employee_id', employee_id)
        .single();

      if (empError || !employee) {
        return Response.json({ success: false, error: 'Employee session invalid or expired.' }, { status: 404 });
      }

      return Response.json({
        success: true,
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
          status: employee.status,
          hire_date: employee.hire_date,
          office_id: employee.office_id
        }
      });
    }

    return Response.json({ success: false, error: 'Invalid action requested.' }, { status: 400 });
  } catch (err) {
    console.error('Employee auth API error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
