import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth';
import { getUserRole, requireAdmin } from '../../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ALLOWED_ROLES = new Set(['admin', 'staff', 'finance']);

function normalizeRole(role) {
  const r = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return ALLOWED_ROLES.has(r) ? r : null;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    const users = (data.users || []).map(u => ({
      id: u.id,
      email: u.email,
      role: getUserRole(u) || 'unassigned',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
    return Response.json({ users });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const body = await req.json();
    const email = body.email;
    const password = body.password;
    const role = normalizeRole(body.role) || 'staff';

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 10) {
      return Response.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
    }

    const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { role },
    });

    if (error) throw error;

    return Response.json({
      success: true,
      user: { id: createdUser.user.id, email: createdUser.user.email, role },
    });
  } catch (err) {
    return Response.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await requireAuth(req);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const { id, role, password } = await req.json();
    if (!id) return Response.json({ error: 'User ID required' }, { status: 400 });

    const updates = {};
    if (role) {
      const normalized = normalizeRole(role);
      if (!normalized) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }
      updates.app_metadata = { role: normalized };
      updates.user_metadata = { role: normalized };
    }
    if (password) {
      if (password.length < 10) {
        return Response.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
      }
      updates.password = password;
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);
    if (error) throw error;

    return Response.json({
      success: true,
      user: { id: data.user.id, email: data.user.email, role: getUserRole(data.user) },
    });
  } catch (err) {
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await requireAuth(req);
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'User ID required' }, { status: 400 });
    if (id === user.id) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
