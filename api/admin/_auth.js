import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify the request has a valid admin session.
 * Returns { userId, error } - if error is set, respond with 401/403.
 */
export async function verifyAdmin(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return { userId: null, error: 'Missing authorization token' };
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return { userId: null, error: 'Server misconfiguration' };
  }

  // Use service role client to verify JWT and check admin flag
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verify the user's JWT
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { userId: null, error: 'Invalid or expired token' };
  }

  // Check is_admin flag in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { userId: null, error: 'Access denied: not an admin' };
  }

  return { userId: user.id, error: null, supabaseAdmin };
}

/**
 * Create a service-role Supabase client for admin queries.
 */
export function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
