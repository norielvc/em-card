import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { requireAdmin } from '../../../lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET - Fetch admin logs with pagination and filtering
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const actionType = searchParams.get('actionType');
    const adminEmail = searchParams.get('adminEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (adminEmail) {
      query = query.eq('admin_email', adminEmail);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    let { data, error, count } = await query;

    if (error) throw error;

    // Resolve missing target_names from their source tables
    const logs = data || [];
    const missing = logs.filter(l => !l.target_name && l.target_id && l.target_table);
    if (missing.length > 0) {
      const byTable = {};
      missing.forEach(l => {
        byTable[l.target_table] = byTable[l.target_table] || [];
        byTable[l.target_table].push(l.target_id);
      });

      const nameMap = {};
      for (const [table, ids] of Object.entries(byTable)) {
        const uniqueIds = [...new Set(ids)];
        if (table === 'upcoming_events') {
          const { data: rows } = await supabase.from(table).select('id, title').in('id', uniqueIds);
          (rows || []).forEach(r => { nameMap[r.id] = r.title; });
        } else {
          const { data: rows } = await supabase.from(table).select('id, last_name, first_name').in('id', uniqueIds);
          (rows || []).forEach(r => {
            const ln = r.last_name || '';
            const fn = r.first_name || '';
            const name = `${ln}, ${fn}`.trim().replace(/^,\s*|,\s*$/g, '');
            nameMap[r.id] = name || null;
          });
        }
      }

      logs.forEach(l => {
        if (!l.target_name && l.target_id && nameMap[l.target_id]) {
          l.target_name = nameMap[l.target_id];
        }
      });
    }

    return Response.json({ logs, total: count || 0 });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new admin log
export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const {
      action_type,
      target_table,
      target_id,
      target_name,
      details,
    } = body;

    // Whitelist allowed action types to prevent log injection
    const ALLOWED_ACTIONS = new Set([
      'login', 'logout', 'scan_event', 'create_registration', 'update_registration',
      'delete_registration', 'create_account', 'update_account', 'create_event',
      'update_event', 'delete_event', 'send_message', 'view_report', 'export_data',
    ]);

    if (!action_type || !ALLOWED_ACTIONS.has(action_type)) {
      return Response.json(
        { error: 'Invalid or missing action_type' },
        { status: 400 }
      );
    }

    // Validate target_table if provided
    const ALLOWED_TABLES = new Set([
      'registrations', 'ValidResidents', 'upcoming_events', 'event_scans',
      'admin_users', 'contact_messages', 'grievances', 'messages', null,
    ]);
    const safeTargetTable = target_table || null;
    if (safeTargetTable && !ALLOWED_TABLES.has(safeTargetTable)) {
      return Response.json(
        { error: 'Invalid target_table' },
        { status: 400 }
      );
    }

    // Derive admin_email from authenticated user (prevent spoofing)
    const admin_email = user.email;

    const { data, error } = await supabase.from('admin_logs').insert([
      {
        admin_email,
        action_type,
        target_table: safeTargetTable,
        target_id: target_id || null,
        target_name: target_name || null,
        details: typeof details === 'object' && details !== null ? details : {},
        ip_address: null,
      },
    ]).select();

    if (error) throw error;

    return Response.json({ success: true, log: data?.[0] });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
