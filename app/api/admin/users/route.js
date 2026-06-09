import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    const users = (data.users || []).map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'admin',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
    return Response.json({ users });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { email, password, role = 'admin' } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });

    if (error) throw error;

    return Response.json({
      success: true,
      user: { id: createdUser.user.id, email: createdUser.user.email, role },
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, role, password } = await req.json();
    if (!id) return Response.json({ error: 'User ID required' }, { status: 400 });

    const updates = {};
    if (role) updates.user_metadata = { role };
    if (password) updates.password = password;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);
    if (error) throw error;

    return Response.json({
      success: true,
      user: { id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role },
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
}
