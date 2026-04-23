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

  try {
    // Run all stats queries in parallel
    const [
      { count: totalUsers },
      { count: totalPrayers },
      { data: todayPrayersData },
      { data: donationData },
      { data: recentActivity }
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('*', { count: 'exact', head: true }),

      // Total prayers
      supabase.from('prayers').select('*', { count: 'exact', head: true }),

      // Today's prayer count (KST)
      supabase
        .from('prayers')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(new Date().toISOString().slice(0, 10)).toISOString()),

      // Donation stats
      supabase
        .from('donations')
        .select('amount, created_at'),

      // Recent signups (last 7 days)
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
    ]);

    const totalDonations = donationData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
    const todayPrayerCount = todayPrayersData?.length || 0;
    const newUsersThisWeek = recentActivity?.length || 0;

    // Monthly donation breakdown (last 6 months)
    const monthlyDonations = {};
    donationData?.forEach(d => {
      const month = d.created_at?.slice(0, 7);
      if (month) {
        monthlyDonations[month] = (monthlyDonations[month] || 0) + (d.amount || 0);
      }
    });

    return res.status(200).json({
      totalUsers: totalUsers || 0,
      totalPrayers: totalPrayers || 0,
      todayPrayers: todayPrayerCount,
      totalDonations,
      donationCount: donationData?.length || 0,
      newUsersThisWeek,
      monthlyDonations,
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
