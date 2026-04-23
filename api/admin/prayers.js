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
  const emotion = query.emotion || '';
  const offset = (page - 1) * limit;

  try {
    let prayerQuery = supabase
      .from('prayers')
      .select('id, user_id, title, content, emotion, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      prayerQuery = prayerQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (emotion) {
      prayerQuery = prayerQuery.eq('emotion', emotion);
    }

    const { data: prayers, error: prayerError, count } = await prayerQuery;

    if (prayerError) throw prayerError;

    // Fetch user emails for display
    const userIds = [...new Set((prayers || []).map(p => p.user_id).filter(Boolean))];
    let userMap = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      profiles?.forEach(p => {
        userMap[p.id] = { name: p.full_name, email: p.email };
      });
    }

    const prayersWithUser = (prayers || []).map(p => ({
      ...p,
      user: userMap[p.user_id] || null,
      // Truncate content for preview
      contentPreview: p.content ? p.content.slice(0, 120) + (p.content.length > 120 ? '...' : '') : '',
    }));

    return res.status(200).json({
      prayers: prayersWithUser,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/prayers] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}
