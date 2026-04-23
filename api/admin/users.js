import { setupCors, handlePreflight } from '../lib/cors.js';
import { verifyAdmin, getAdminClient } from './_auth.js';

export default async function handler(req, res) {
  setupCors(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { error } = await verifyAdmin(req);
  if (error) {
    return res.status(error === 'Access denied: not an admin' ? 403 : 401).json({ error });
  }

  const supabase = getAdminClient();

  const { query } = req;
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '20', 10);
  const search = query.search || '';
  const offset = (page - 1) * limit;

  try {
    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, email, created_at, plan, is_admin, last_activity_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      profileQuery = profileQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: profiles, error: profileError, count } = await profileQuery;

    if (profileError) throw profileError;

    // Get prayer counts per user (batch)
    const userIds = (profiles || []).map(p => p.id);
    let prayerCounts = {};

    if (userIds.length > 0) {
      const { data: prayerData } = await supabase
        .from('prayers')
        .select('user_id')
        .in('user_id', userIds);

      prayerData?.forEach(p => {
        prayerCounts[p.user_id] = (prayerCounts[p.user_id] || 0) + 1;
      });
    }

    const usersWithStats = (profiles || []).map(u => ({
      ...u,
      prayerCount: prayerCounts[u.id] || 0,
    }));

    return res.status(200).json({
      users: usersWithStats,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/users] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
