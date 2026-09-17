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

    const insertPayload = {
      employee_id: employee_id.trim().toUpperCase(),
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
