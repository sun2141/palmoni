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
  const offset = (page - 1) * limit;

  try {
    const { data: donations, error: donationError, count } = await supabase
      .from('donations')
      .select('id, user_id, amount, stripe_payment_intent, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (donationError) throw donationError;

    // Fetch user info
    const userIds = [...new Set((donations || []).map(d => d.user_id).filter(Boolean))];
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

    const donationsWithUser = (donations || []).map(d => ({
      ...d,
      user: d.user_id ? (userMap[d.user_id] || null) : null,
      // Stripe status: if payment_intent exists, consider it successful
      stripeStatus: d.stripe_payment_intent ? 'succeeded' : 'unknown',
    }));

    return res.status(200).json({
      donations: donationsWithUser,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/donations] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch donations' });
  }
}
