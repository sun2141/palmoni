import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Rate limiting helper
 *
 * 전략:
 * - 비로그인: 기도문 미리보기만 가능 (저장 안됨), 하루 3회
 * - 로그인(무료): 하루 3회 기도맡기기 (자동 저장)
 * - 프리미엄: 무제한 (추후)
 */
export async function checkRateLimit(userId = null, anonymousId = null) {
  const today = new Date().toISOString().split('T')[0];
  const DAILY_LIMIT_FREE = 3;
  const DAILY_LIMIT_ANONYMOUS = 3;

  if (userId) {
    // 로그인 사용자: 하루 3회 제한
    const { count, error } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    if (error) {
      console.error('Error checking user usage:', error);
      return { allowed: false, error: 'Failed to check rate limit' };
    }

    if (count >= DAILY_LIMIT_FREE) {
      return {
        allowed: false,
        tier: 'free',
        limit: DAILY_LIMIT_FREE,
        used: count,
        remaining: 0,
        message: `오늘의 기도맡기기 횟수(${DAILY_LIMIT_FREE}회)를 모두 사용하셨습니다. 더 기도하고 싶으시다면 직접 기도해보시는 것은 어떨까요? 내일 다시 기도를 맡겨주세요!`
      };
    }

    return {
      allowed: true,
      tier: 'free',
      limit: DAILY_LIMIT_FREE,
      used: count,
      remaining: DAILY_LIMIT_FREE - count
    };
  } else if (anonymousId) {
    // 비로그인 사용자: 미리보기만 가능, 하루 3회
    const { count, error } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('anonymous_id', anonymousId)
      .gte('created_at', `${today}T00:00:00Z`);

    if (error) {
      console.error('Error checking anonymous usage:', error);
      return { allowed: false, error: 'Failed to check rate limit' };
    }

    if (count >= DAILY_LIMIT_ANONYMOUS) {
      return {
        allowed: false,
        tier: 'anonymous',
        limit: DAILY_LIMIT_ANONYMOUS,
        used: count,
        remaining: 0,
        message: '오늘의 기도문 체험 횟수를 모두 사용하셨습니다. 회원가입하시면 기도문이 저장되고, 매일 3회 기도를 맡길 수 있습니다!'
      };
    }

    return {
      allowed: true,
      tier: 'anonymous',
      limit: DAILY_LIMIT_ANONYMOUS,
      used: count,
      remaining: DAILY_LIMIT_ANONYMOUS - count,
      previewOnly: true // 미리보기만 가능 (저장 안됨)
    };
  }

  // Default: allow but log warning
  console.warn('Rate limit check called without userId or anonymousId');
  return { allowed: true };
}

/**
 * Log API usage for rate limiting
 */
export async function logUsage(userId = null, anonymousId = null, action = 'prayer_generation') {
  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: userId,
      anonymous_id: anonymousId,
      action: action
    });

  if (error) {
    console.error('Error logging usage:', error);
  }

  // Increment daily counter and update streak for registered users
  if (userId) {
    const { error: updateError } = await supabase.rpc('increment_prayer_count', {
      user_id_param: userId
    });

    if (updateError) {
      console.error('Error incrementing prayer count:', updateError);
    }

    // 스트릭 업데이트
    await updateStreak(userId);
  }
}

/**
 * 스트릭(연속 기도 일수) 업데이트
 */
export async function updateStreak(userId) {
  if (!userId) return { error: 'User not logged in' };

  const today = new Date().toISOString().split('T')[0];

  // 현재 프로필 가져오기
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, total_prayer_days, last_prayer_date')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile for streak:', profileError);
    return { error: profileError.message };
  }

  const lastPrayerDate = profile?.last_prayer_date;
  let newStreak = profile?.current_streak || 0;
  let longestStreak = profile?.longest_streak || 0;
  let totalDays = profile?.total_prayer_days || 0;

  // 오늘 이미 기도한 경우 업데이트하지 않음
  if (lastPrayerDate === today) {
    return { data: profile, error: null };
  }

  // 어제 기도한 경우 스트릭 증가
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (lastPrayerDate === yesterday) {
    newStreak += 1;
  } else {
    // 연속이 끊긴 경우 1부터 다시 시작
    newStreak = 1;
  }

  // 총 기도한 날 증가
  totalDays += 1;

  // 최장 기록 갱신
  if (newStreak > longestStreak) {
    longestStreak = newStreak;
  }

  // 프로필 업데이트
  const { data, error } = await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      total_prayer_days: totalDays,
      last_prayer_date: today,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating streak:', error);
    return { error: error.message };
  }

  return { data, error: null };
}

/**
 * Save prayer to database
 */
export async function savePrayer(prayerData) {
  const { userId, title, content, topic, emotion, isPublic } = prayerData;

  if (!userId) {
    return { error: 'User must be logged in to save prayers' };
  }

  const { data, error } = await supabase
    .from('prayers')
    .insert({
      user_id: userId,
      title: title,
      content: content,
      topic: topic,
      emotion: emotion || 'peace',
      is_public: isPublic || false
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving prayer:', error);
    return { error: error.message };
  }

  return { data, error: null };
}

/**
 * Get user's prayers with pagination
 */
export async function getUserPrayers(userId, { limit = 20, offset = 0, emotion = null } = {}) {
  let query = supabase
    .from('prayers')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (emotion) {
    query = query.eq('emotion', emotion);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching prayers:', error);
    return { data: [], error: error.message, count: 0 };
  }

  return { data, error: null, count };
}

/**
 * Delete prayer
 */
export async function deletePrayer(prayerId, userId) {
  const { error } = await supabase
    .from('prayers')
    .delete()
    .eq('id', prayerId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting prayer:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Get user profile
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// =============================================
// 예약 기도 시스템 (Scheduled Prayer System)
// =============================================

/**
 * 사용자의 기도 스케줄 가져오기
 */
export async function getPrayerSchedule(userId) {
  const { data, error } = await supabase
    .from('prayer_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
    console.error('Error fetching schedule:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 기도 스케줄 생성/업데이트
 */
export async function savePrayerSchedule(userId, scheduleData) {
  const { data: existing } = await getPrayerSchedule(userId);

  if (existing) {
    // 업데이트
    const { data, error } = await supabase
      .from('prayer_schedules')
      .update({
        ...scheduleData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } else {
    // 새로 생성
    const { data, error } = await supabase
      .from('prayer_schedules')
      .insert({
        user_id: userId,
        ...scheduleData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  }
}

/**
 * 오늘의 기도 슬롯 가져오기
 */
export async function getTodayPrayerSlots(userId) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_prayer_slots')
    .select(`
      *,
      prayer_executions (
        id,
        prayer_title,
        prayer_content,
        executed_at,
        user_viewed
      )
    `)
    .eq('user_id', userId)
    .eq('date', today)
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching today slots:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 최근 기도 실행 내역 가져오기
 */
export async function getRecentPrayerExecutions(userId, limit = 10) {
  const { data, error } = await supabase
    .from('prayer_executions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching executions:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 확인하지 않은 기도 가져오기
 */
export async function getUnviewedPrayers(userId) {
  const { data, error } = await supabase
    .from('prayer_executions')
    .select('*')
    .eq('user_id', userId)
    .eq('user_viewed', false)
    .eq('status', 'completed')
    .order('executed_at', { ascending: false });

  if (error) {
    console.error('Error fetching unviewed prayers:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 기도 확인 표시
 */
export async function markPrayerAsViewed(executionId) {
  const { error } = await supabase.rpc('mark_prayer_viewed', {
    execution_uuid: executionId
  });

  if (error) {
    console.error('Error marking prayer as viewed:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * 기도 통계 가져오기
 */
export async function getPrayerStats(userId) {
  const { data: profile } = await getUserProfile(userId);
  const { data: executions } = await getRecentPrayerExecutions(userId, 100);
  const { data: unviewed } = await getUnviewedPrayers(userId);

  return {
    totalPrayers: profile?.total_prayers_generated || 0,
    currentStreak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    scheduledPrayersTotal: executions?.length || 0,
    unviewedCount: unviewed?.length || 0,
    lastPrayerDate: profile?.last_prayer_date
  };
}

// =============================================
// 오늘의 기도 세션 (Today's Prayer Session)
// localStorage 백업용 Supabase 연동
// =============================================

/**
 * 오늘의 기도 세션 저장 (Supabase 백업)
 */
export async function saveTodaysPrayerSession(userId, sessionData) {
  if (!userId) return { error: 'User not logged in' };

  const today = new Date().toISOString().split('T')[0];

  // 기존 세션 확인
  const { data: existing } = await supabase
    .from('todays_prayer_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('session_date', today)
    .single();

  // 여러 기도 지원: prayers 배열이 있으면 JSON으로 저장
  const prayers = sessionData.prayers || [];
  const firstPrayer = prayers[0]?.prayer || sessionData.prayer || {};
  const firstTimes = prayers[0]?.times || sessionData.times || [];
  const firstIndex = prayers[0]?.currentIndex ?? sessionData.currentIndex ?? 0;
  const firstStatus = prayers[0]?.status || sessionData.status || 'idle';

  const payload = {
    user_id: userId,
    session_date: today,
    prayer_topic: firstPrayer.topic || '',
    prayer_title: firstPrayer.title || '',
    prayer_content: firstPrayer.content || '',
    prayer_emotion: firstPrayer.emotion || 'peace',
    prayer_times: firstTimes,
    current_index: firstIndex,
    status: firstStatus,
    // 여러 기도를 JSON으로 저장 (prayers_data 컬럼 사용)
    prayers_data: prayers.length > 0 ? JSON.stringify(prayers) : null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // 업데이트
    const { data, error } = await supabase
      .from('todays_prayer_sessions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prayer session:', error);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } else {
    // 새로 생성
    const { data, error } = await supabase
      .from('todays_prayer_sessions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating prayer session:', error);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  }
}

/**
 * 오늘의 기도 세션 불러오기 (Supabase에서)
 */
export async function getTodaysPrayerSession(userId) {
  if (!userId) return { data: null, error: 'User not logged in' };

  const today = new Date().toISOString().split('T')[0];

  // 오늘 세션 확인
  const { data: todaySession, error: todayError } = await supabase
    .from('todays_prayer_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', today)
    .single();

  if (todayError && todayError.code !== 'PGRST116') {
    console.error('Error fetching today session:', todayError);
  }

  if (todaySession) {
    // 여러 기도 데이터가 있으면 파싱
    let prayers = null;
    if (todaySession.prayers_data) {
      try {
        prayers = JSON.parse(todaySession.prayers_data);
      } catch (e) {
        console.error('Failed to parse prayers_data:', e);
      }
    }

    // 여러 기도가 있으면 prayers 배열 반환
    if (prayers && Array.isArray(prayers) && prayers.length > 0) {
      return {
        data: {
          prayers: prayers,
          date: todaySession.session_date,
        },
        isYesterday: false,
        error: null,
      };
    }

    // 기존 단일 기도 형식 (하위 호환)
    return {
      data: {
        prayer: {
          topic: todaySession.prayer_topic,
          title: todaySession.prayer_title,
          content: todaySession.prayer_content,
          emotion: todaySession.prayer_emotion,
        },
        times: todaySession.prayer_times,
        currentIndex: todaySession.current_index,
        status: todaySession.status,
        date: todaySession.session_date,
      },
      isYesterday: false,
      error: null,
    };
  }

  // 어제 또는 이전 세션 확인 (완료된 기도 표시용)
  // 오늘보다 이전의 가장 최근 세션을 가져옴
  const { data: oldSessions, error: oldError } = await supabase
    .from('todays_prayer_sessions')
    .select('*')
    .eq('user_id', userId)
    .lt('session_date', today)
    .order('session_date', { ascending: false })
    .limit(1);

  if (oldError) {
    console.error('Error fetching old session:', oldError);
  }

  const oldSession = oldSessions?.[0];
  if (oldSession && oldSession.status !== 'idle') {
    // 이전 세션이 있으면 삭제 (한 번 알림 후 정리)
    // 삭제는 비동기로 처리하고 데이터는 반환
    supabase
      .from('todays_prayer_sessions')
      .delete()
      .eq('id', oldSession.id)
      .then(() => {
        console.log('Old prayer session cleaned up');
      })
      .catch((e) => {
        console.warn('Failed to delete old session:', e);
      });

    // 여러 기도 데이터가 있으면 파싱
    let prayers = null;
    if (oldSession.prayers_data) {
      try {
        prayers = JSON.parse(oldSession.prayers_data);
      } catch (e) {
        console.error('Failed to parse prayers_data:', e);
      }
    }

    // 여러 기도가 있으면 prayers 배열 반환
    if (prayers && Array.isArray(prayers) && prayers.length > 0) {
      return {
        data: {
          prayers: prayers.map(p => ({ ...p, status: 'completed' })),
          date: oldSession.session_date,
        },
        isYesterday: true,
        error: null,
      };
    }

    // 기존 단일 기도 형식
    return {
      data: {
        prayer: {
          topic: oldSession.prayer_topic,
          title: oldSession.prayer_title,
          content: oldSession.prayer_content,
          emotion: oldSession.prayer_emotion,
        },
        times: oldSession.prayer_times,
        currentIndex: oldSession.current_index,
        status: 'yesterday_completed',
        date: oldSession.session_date,
      },
      isYesterday: true,
      error: null,
    };
  }

  return { data: null, isYesterday: false, error: null };
}

/**
 * 오늘 활성 사용자 수 가져오기
 * - 오늘 기도 세션이 있는 사용자 수를 카운트
 * - 200명 미만이면 null 반환 (가상 숫자 표시용)
 */
export async function getActiveUsersCount() {
  const today = new Date().toISOString().split('T')[0];

  try {
    // 오늘 기도 세션이 있는 사용자 수
    const { count, error } = await supabase
      .from('todays_prayer_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('session_date', today);

    if (error) {
      console.error('Error fetching active users count:', error);
      return null;
    }

    // 200명 이상이면 실제 수 반환, 미만이면 null
    return count >= 200 ? count : null;
  } catch (e) {
    console.error('Failed to get active users count:', e);
    return null;
  }
}

// =============================================
// 기도 여정 시스템 (Prayer Loop System)
// =============================================

/**
 * 기도 여정 생성
 */
export async function createLoop(userId, { title, topic, emotion, continuePrayer = true }) {
  if (!userId) return { data: null, error: 'User not logged in' };

  const { data, error } = await supabase
    .from('prayer_loops')
    .insert({
      user_id: userId,
      title,
      topic,
      initial_emotion: emotion,
      current_emotion: emotion,
      continue_prayer: continuePrayer,
      status: 'active',
      started_at: new Date().toISOString(),
      total_days: 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating loop:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 활성 기도 여정 가져오기
 */
export async function getActiveLoop(userId) {
  if (!userId) return { data: null, error: 'User not logged in' };

  const { data, error } = await supabase
    .from('prayer_loops')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'checkin_due', 'continued'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active loop:', error);
    return { data: null, error: error.message };
  }

  return { data: data || null, error: null };
}

/**
 * 기도 여정 상세 가져오기
 */
export async function getLoopById(loopId) {
  const { data, error } = await supabase
    .from('prayer_loops')
    .select('*')
    .eq('id', loopId)
    .single();

  if (error) {
    console.error('Error fetching loop:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 기도 여정 상태 업데이트
 */
export async function updateLoopStatus(loopId, status, additionalData = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData,
  };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('prayer_loops')
    .update(updateData)
    .eq('id', loopId)
    .select()
    .single();

  if (error) {
    console.error('Error updating loop status:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 기도 여정 감정 업데이트
 */
export async function updateLoopEmotion(loopId, emotion) {
  const { data, error } = await supabase
    .from('prayer_loops')
    .update({
      current_emotion: emotion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loopId)
    .select()
    .single();

  if (error) {
    console.error('Error updating loop emotion:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 기도 여정 히스토리 가져오기
 */
export async function getLoopHistory(userId, { limit = 20, offset = 0, status = null } = {}) {
  if (!userId) return { data: [], error: 'User not logged in', count: 0 };

  let query = supabase
    .from('prayer_loops')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching loop history:', error);
    return { data: [], error: error.message, count: 0 };
  }

  return { data: data || [], error: null, count };
}

/**
 * 일별 세션 생성
 */
export async function createSession(loopId, userId, { dayNumber, emotion }) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('prayer_sessions')
    .insert({
      loop_id: loopId,
      user_id: userId,
      session_date: today,
      day_number: dayNumber,
      emotion,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 오늘의 세션 가져오기
 */
export async function getTodaysLoopSession(loopId) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('prayer_sessions')
    .select('*')
    .eq('loop_id', loopId)
    .eq('session_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching today session:', error);
    return { data: null, error: error.message };
  }

  return { data: data || null, error: null };
}

/**
 * 세션 업데이트 (기도 완료 등)
 */
export async function updateSession(sessionId, updateData) {
  const { data, error } = await supabase
    .from('prayer_sessions')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 세션에 기도문 저장
 */
export async function saveSessionPrayer(sessionId, { title, content }) {
  const { data, error } = await supabase
    .from('prayer_sessions')
    .update({
      prayer_title: title,
      prayer_content: content,
      prayer_generated_at: new Date().toISOString(),
      status: 'prayed',
      prayed_at: new Date().toISOString(),
      prayer_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error saving session prayer:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 세션 히스토리 가져오기
 */
export async function getSessionHistory(loopId, { limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('prayer_sessions')
    .select('*')
    .eq('loop_id', loopId)
    .order('session_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching session history:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 체크인 생성
 */
export async function createCheckin(loopId, sessionId, userId, { responseType, nextEmotion = null, note = null }) {
  const { data, error } = await supabase
    .from('prayer_checkins')
    .insert({
      loop_id: loopId,
      session_id: sessionId,
      user_id: userId,
      response_type: responseType,
      next_emotion: nextEmotion,
      note,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating checkin:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 마지막 체크인 가져오기
 */
export async function getLastCheckin(loopId) {
  const { data, error } = await supabase
    .from('prayer_checkins')
    .select('*')
    .eq('loop_id', loopId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching last checkin:', error);
    return { data: null, error: error.message };
  }

  return { data: data || null, error: null };
}

/**
 * 체크인 히스토리 가져오기
 */
export async function getCheckinHistory(loopId) {
  const { data, error } = await supabase
    .from('prayer_checkins')
    .select('*')
    .eq('loop_id', loopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching checkin history:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
