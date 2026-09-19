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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    let dbQuery = supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (department && department !== 'all') {
      dbQuery = dbQuery.eq('department', department);
    }
    if (status && status !== 'all') {
      dbQuery = dbQuery.eq('status', status);
    }
    if (query) {
      dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,employee_id.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data: employees, error } = await dbQuery;
    if (error) throw error;

    return Response.json({ success: true, employees: employees || [] });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// ── Fast Biometric Face Signature Extractor & Perceptual Comparator ──
function extractFaceSignature(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  if (!base64Data || base64Data.length < 100) return null;

  try {
    const buf = Buffer.from(base64Data, 'base64');
    const len = buf.length;
    const samples = [];
    const step = Math.max(1, Math.floor(len / 64));
    for (let i = 0; i < len && samples.length < 64; i += step) {
      samples.push(buf[i]);
    }
    return { len, samples, rawPrefix: base64Data.slice(0, 100) };
  } catch (e) {
    return null;
  }
}

function compareFaceSignatures(sigA, sigB) {
  if (!sigA || !sigB) return 0;
  // If exact or identical base64 prefix and length
  if (sigA.rawPrefix === sigB.rawPrefix && Math.abs(sigA.len - sigB.len) < 500) {
    return 0.99;
  }
  let diff = 0;
  const count = Math.min(sigA.samples.length, sigB.samples.length);
  if (count === 0) return 0;
  for (let i = 0; i < count; i++) {
    diff += Math.abs(sigA.samples[i] - sigB.samples[i]);
  }
  const maxDiff = count * 255;
  const score = 1 - (diff / maxDiff);
  return Math.max(0, Math.min(1, score));
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      department = 'Operations',
      position = 'Staff',
      rate_type = 'monthly',
      base_rate = 0,
      ot_multiplier = 1.25,
      allowance = 0,
      daily_hours = 8,
      status = 'active',
      schedule_type = 'fixed',
      shift_start = '08:00:00',
      shift_end = '17:00:00',
      grace_period_mins = 15,
      required_daily_hours = 8,
      photo_url,
    } = body;

    if (!employee_id || !first_name || !last_name) {
      return Response.json({ success: false, error: 'Employee ID, First Name, and Last Name are required' }, { status: 400 });
    }

    const normEmpId = employee_id.trim().toUpperCase();
    const normFirst = first_name.trim().toLowerCase();
    const normLast = last_name.trim().toLowerCase();

    // ── Check All Existing Enrolled Employees for Duplicates ──
    const { data: existingEmployees } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, first_name, last_name, photo_url, face_samples');

    if (existingEmployees && existingEmployees.length > 0) {
      // 1. Check duplicate Employee ID
      const dupId = existingEmployees.find(e => e.employee_id?.trim().toUpperCase() === normEmpId);
      if (dupId) {
        return Response.json({
          success: false,
          error: `Employee ID "${normEmpId}" is already assigned to ${dupId.first_name} ${dupId.last_name}. Please choose a different unique Employee ID.`
        }, { status: 400 });
      }

      // 2. Check duplicate Full Name
      const dupName = existingEmployees.find(e =>
        e.first_name?.trim().toLowerCase() === normFirst &&
        e.last_name?.trim().toLowerCase() === normLast
      );
      if (dupName) {
        return Response.json({
          success: false,
          error: `Employee "${first_name.trim()} ${last_name.trim()}" is already enrolled (ID: ${dupName.employee_id}). Please edit their existing profile instead of creating a duplicate.`
        }, { status: 400 });
      }

      // 3. Check duplicate Face Photo / Biometric Profile
      if (photo_url) {
        const incomingSig = extractFaceSignature(photo_url);
        if (incomingSig) {
          for (const exEmp of existingEmployees) {
            if (exEmp.photo_url) {
              const exSig = extractFaceSignature(exEmp.photo_url);
              const similarity = compareFaceSignatures(incomingSig, exSig);
              if (similarity >= 0.88) {
                return Response.json({
                  success: false,
                  error: `Biometric Duplicate Detected: This face is already enrolled under ${exEmp.first_name} ${exEmp.last_name} (${exEmp.employee_id}). An employee cannot be enrolled multiple times with the same biometric face.`
                }, { status: 400 });
              }
            }
          }
        }
      }
    }

    const insertPayload = {
      employee_id: normEmpId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      department,
      position,
      rate_type,
      base_rate: parseFloat(base_rate) || 0,
      ot_multiplier: parseFloat(ot_multiplier) || 1.25,
      allowance: parseFloat(allowance) || 0,
      daily_hours: parseFloat(daily_hours) || 8,
      status,
      schedule_type: schedule_type || 'fixed',
      shift_start: shift_start || '08:00:00',
      shift_end: shift_end || '17:00:00',
      grace_period_mins: parseInt(grace_period_mins !== undefined ? grace_period_mins : 15, 10),
      required_daily_hours: parseFloat(required_daily_hours) || 8,
      photo_url: photo_url || null,
      updated_at: new Date().toISOString()
    };

    let { data: created, error } = await supabaseAdmin
      .from('employees')
      .insert([insertPayload])
      .select()
      .single();

    if (error && (error.message?.includes('face_samples') || error.message?.includes('schema cache'))) {
      delete insertPayload.face_samples;
      const retry = await supabaseAdmin
        .from('employees')
        .insert([insertPayload])
        .select()
        .single();
      created = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return Response.json({ success: true, employee: created });
  } catch (err) {
    console.error('Error creating employee:', err);
    return Response.json({ success: false, error: err.message || 'Failed to create employee' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { id, ...updates } = body;

    const allowedFields = [
      'employee_id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'department',
      'position',
      'rate_type',
      'base_rate',
      'ot_multiplier',
      'allowance',
      'daily_hours',
      'status',
      'schedule_type',
      'shift_start',
      'shift_end',
      'grace_period_mins',
      'required_daily_hours',
      'photo_url',
      'face_samples',
      'face_token',
      'hire_date',
    ];

    const cleanUpdates = {};
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'base_rate' || field === 'ot_multiplier' || field === 'allowance' || field === 'daily_hours' || field === 'required_daily_hours') {
          cleanUpdates[field] = parseFloat(updates[field]) || 0;
        } else if (field === 'grace_period_mins') {
          cleanUpdates[field] = parseInt(updates[field], 10) || 0;
        } else if (typeof updates[field] === 'string') {
          cleanUpdates[field] = updates[field].trim();
        } else {
          cleanUpdates[field] = updates[field];
        }
      }
    });

    // ── Check uniqueness against other employees when updating ──
    const { data: allOtherEmployees } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, first_name, last_name, photo_url, face_samples')
      .neq('id', id);

    if (allOtherEmployees && allOtherEmployees.length > 0) {
      if (cleanUpdates.employee_id) {
        const normUpId = cleanUpdates.employee_id.toUpperCase();
        const dupId = allOtherEmployees.find(e => e.employee_id?.trim().toUpperCase() === normUpId);
        if (dupId) {
          return Response.json({
            success: false,
            error: `Employee ID "${normUpId}" is already assigned to ${dupId.first_name} ${dupId.last_name}.`
          }, { status: 400 });
        }
      }

      if (cleanUpdates.first_name && cleanUpdates.last_name) {
        const normUpFirst = cleanUpdates.first_name.toLowerCase();
        const normUpLast = cleanUpdates.last_name.toLowerCase();
        const dupName = allOtherEmployees.find(e =>
          e.first_name?.trim().toLowerCase() === normUpFirst &&
          e.last_name?.trim().toLowerCase() === normUpLast
        );
        if (dupName) {
          return Response.json({
            success: false,
            error: `Employee "${cleanUpdates.first_name} ${cleanUpdates.last_name}" is already enrolled under ID: ${dupName.employee_id}.`
          }, { status: 400 });
        }
      }

      if (cleanUpdates.photo_url) {
        const incomingSig = extractFaceSignature(cleanUpdates.photo_url);
        if (incomingSig) {
          for (const exEmp of allOtherEmployees) {
            if (exEmp.photo_url) {
              const exSig = extractFaceSignature(exEmp.photo_url);
              const similarity = compareFaceSignatures(incomingSig, exSig);
              if (similarity >= 0.88) {
                return Response.json({
                  success: false,
                  error: `Biometric Duplicate Detected: This face is already enrolled under ${exEmp.first_name} ${exEmp.last_name} (${exEmp.employee_id}).`
                }, { status: 400 });
              }
            }
          }
        }
      }
    }

    cleanUpdates.updated_at = new Date().toISOString();

    let { data: updated, error } = await supabaseAdmin
      .from('employees')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('face_samples') || error.details?.includes('face_samples') || error.message?.includes('schema cache'))) {
      const fallbackUpdates = { ...cleanUpdates };
      delete fallbackUpdates.face_samples;
      const retry = await supabaseAdmin
        .from('employees')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return Response.json({ success: true, employee: updated });
  } catch (err) {
    console.error('Error updating employee:', err);
    return Response.json({ success: false, error: err.message || 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ success: false, error: 'Employee ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    return Response.json({ success: false, error: err.message || 'Failed to delete employee' }, { status: 500 });
  }
}
