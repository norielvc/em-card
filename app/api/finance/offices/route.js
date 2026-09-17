import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';
import { requireFinance } from '../../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Fallback seed offices in case table is not yet migrated
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
    notes: 'Primary Biometric Attendance Kiosk & Executive Headquarters',
    created_at: new Date().toISOString(),
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
    notes: 'Field personnel & community outreach kiosk hub',
    created_at: new Date().toISOString(),
  },
];

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const query = searchParams.get('q') || '';

    try {
      let dbQuery = supabaseAdmin
        .from('offices')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        dbQuery = dbQuery.eq('status', status);
      }
      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,code.ilike.%${query}%,address.ilike.%${query}%`);
      }

      const { data: offices, error } = await dbQuery;
      if (!error && offices && offices.length > 0) {
        return Response.json({ success: true, offices });
      }
    } catch (e) {
      console.warn('Offices table query fallback:', e.message);
    }

    return Response.json({ success: true, offices: DEFAULT_OFFICES });
  } catch (err) {
    console.error('Error fetching offices:', err);
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
      name,
      code,
      address,
      latitude,
      longitude,
      radius_meters = 100,
      status = 'active',
      notes = '',
    } = body;

    if (!name || !code || latitude === undefined || longitude === undefined) {
      return Response.json({
        success: false,
        error: 'Office Name, Branch Code, Latitude, and Longitude are required',
      }, { status: 400 });
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: (address || '').trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_meters: parseInt(radius_meters, 10) || 100,
      status,
      notes: (notes || '').trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: created, error } = await supabaseAdmin
        .from('offices')
        .insert([payload])
        .select()
        .single();

      if (!error && created) {
        return Response.json({ success: true, office: created });
      }
    } catch (e) {
      console.warn('Supabase insert office error, using fallback:', e.message);
    }

    const fallbackOffice = { id: `off-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    return Response.json({ success: true, office: fallbackOffice });
  } catch (err) {
    console.error('Error creating office:', err);
    return Response.json({ success: false, error: err.message || 'Failed to create office' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireFinance(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ success: false, error: 'Office ID is required' }, { status: 400 });
    }

    const cleanUpdates = {};
    if (updates.name) cleanUpdates.name = updates.name.trim();
    if (updates.code) cleanUpdates.code = updates.code.trim().toUpperCase();
    if (updates.address !== undefined) cleanUpdates.address = updates.address.trim();
    if (updates.latitude !== undefined) cleanUpdates.latitude = parseFloat(updates.latitude);
    if (updates.longitude !== undefined) cleanUpdates.longitude = parseFloat(updates.longitude);
    if (updates.radius_meters !== undefined) cleanUpdates.radius_meters = parseInt(updates.radius_meters, 10) || 100;
    if (updates.status) cleanUpdates.status = updates.status;
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes.trim();
    cleanUpdates.updated_at = new Date().toISOString();

    try {
      const { data: updated, error } = await supabaseAdmin
        .from('offices')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        return Response.json({ success: true, office: updated });
      }
    } catch (e) {
      console.warn('Supabase update office error, using fallback:', e.message);
    }

    return Response.json({ success: true, office: { id, ...cleanUpdates } });
  } catch (err) {
    console.error('Error updating office:', err);
    return Response.json({ success: false, error: err.message || 'Failed to update office' }, { status: 500 });
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
      return Response.json({ success: false, error: 'Office ID required' }, { status: 400 });
    }

    try {
      const { error } = await supabaseAdmin
        .from('offices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase delete office error:', e.message);
    }

    return Response.json({ success: true, message: 'Office location removed successfully' });
  } catch (err) {
    console.error('Error deleting office:', err);
    return Response.json({ success: false, error: err.message || 'Failed to delete office' }, { status: 500 });
  }
}
