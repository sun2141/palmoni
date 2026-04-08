import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getTodaysLoopSession,
    createSession,
    updateSession,
    saveSessionPrayer,
    getSessionHistory,
    updateLoopStatus,
} from '../lib/supabaseClient';

/**
 * 일별 세션 관리 훅
 */
export function useSession(loopId, loopData = null) {
    const { user } = useAuth();
    const [todaysSession, setTodaysSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 오늘 세션 로드 또는 생성
    useEffect(() => {
        if (!loopId || !user?.id) {
            setLoading(false);
            return;
        }

        const loadOrCreateSession = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. 오늘 세션 조회
                const { data: existingSession, error: fetchError } = await getTodaysLoopSession(loopId);

                if (fetchError) {
                    setError(fetchError);
                    return;
                }

                if (existingSession) {
                    setTodaysSession(existingSession);
                    return;
                }

                // 2. 오늘 세션이 없으면 생성 (루프가 active 또는 continued 상태일 때만)
                // 단, 첫 번째 세션은 createLoop에서 이미 생성하므로 여기서는 2일차부터만 생성
                if (loopData && ['active', 'continued'].includes(loopData.status)) {
                    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

                    // 이미 오늘 세션이 있는지 다시 확인 (race condition 방지)
                    if (loopData.last_session_date === today) {
                        // 이미 오늘 세션 있음 (다른 탭에서 생성됨)
                        const { data: refreshed } = await getTodaysLoopSession(loopId);
                        if (refreshed) {
                            setTodaysSession(refreshed);
                            return;
                        }
                        // last_session_date가 오늘이지만 세션이 없는 경우 (생성 실패 등) → 아래에서 생성
                    }

                    // 1일차 세션 누락 처리: last_session_date가 오늘이면 진짜 누락된 1일차
                    // last_session_date가 오늘이 아니면 새 날이므로 2일차 이상으로 처리
                    if (loopData.total_days === 1 && loopData.last_session_date === today) {
                        console.warn('[useSession] Day 1 session missing, creating now');
                        const { data: newSession, error: createError } = await createSession(
                            loopId,
                            user.id,
                            { dayNumber: 1, emotion: loopData.current_emotion }
                        );
                        if (!createError && newSession) {
                            setTodaysSession(newSession);
                        }
                        return;
                    }

                    // 새 세션 생성 (2일차 이상) - createSession 내부에서 중복 체크함
                    const newDayNumber = (loopData.total_days || 0) + 1;
                    const { data: newSession, error: createError } = await createSession(
                        loopId,
                        user.id,
                        {
                            dayNumber: newDayNumber,
                            emotion: loopData.current_emotion,
                        }
                    );

                    if (createError) {
                        setError(createError);
                        return;
                    }

                    // 루프 업데이트 (total_days, last_session_date, status)
                    await updateLoopStatus(loopId, 'active', {
                        total_days: newDayNumber,
                        last_session_date: today,
                    });

                    setTodaysSession(newSession);
                }
            } catch (e) {
                console.error('Failed to load/create session:', e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        loadOrCreateSession();
    // loopData 객체 전체 대신 필요한 원시값만 의존성으로 사용 (불필요한 재실행 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loopId, loopData?.id, loopData?.status, loopData?.total_days, loopData?.last_session_date, loopData?.current_emotion, user?.id]);

    /**
     * 기도 완료 기록
     */
    const markAsPrayed = useCallback(async (prayerData = null) => {
        if (!todaysSession?.id) {
            return { data: null, error: 'No session found' };
        }

        try {
            if (prayerData) {
                // 기도문과 함께 저장
                const { data, error: saveError } = await saveSessionPrayer(todaysSession.id, prayerData);
                if (saveError) {
                    return { data: null, error: saveError };
                }
                setTodaysSession(data);
                return { data, error: null };
            } else {
                // 기도 횟수만 증가
                const { data, error: updateError } = await updateSession(todaysSession.id, {
                    status: 'prayed',
                    prayed_at: new Date().toISOString(),
                    prayer_count: (todaysSession.prayer_count || 0) + 1,
                });
                if (updateError) {
                    return { data: null, error: updateError };
                }
                setTodaysSession(data);
                return { data, error: null };
            }
        } catch (e) {
            console.error('Failed to mark as prayed:', e);
            return { data: null, error: e.message };
        }
    }, [todaysSession]);

    /**
     * 체크인 대기 상태로 전환
     */
    const requestCheckin = useCallback(async () => {
        if (!todaysSession?.id) {
            return { data: null, error: 'No session found' };
        }

        try {
            const { data, error: updateError } = await updateSession(todaysSession.id, {
                status: 'checkin_due',
            });

            if (updateError) {
                return { data: null, error: updateError };
            }

            setTodaysSession(data);
            return { data, error: null };
        } catch (e) {
            console.error('Failed to request checkin:', e);
            return { data: null, error: e.message };
        }
    }, [todaysSession]);

    /**
     * 세션 완료
     */
    const completeSession = useCallback(async () => {
        if (!todaysSession?.id) {
            return { data: null, error: 'No session found' };
        }

        try {
            const { data, error: updateError } = await updateSession(todaysSession.id, {
                status: 'completed',
                completed_at: new Date().toISOString(),
            });

            if (updateError) {
                return { data: null, error: updateError };
            }

            setTodaysSession(data);
            return { data, error: null };
        } catch (e) {
            console.error('Failed to complete session:', e);
            return { data: null, error: e.message };
        }
    }, [todaysSession]);

    /**
     * 세션 히스토리 가져오기
     */
    const fetchHistory = useCallback(async (options = {}) => {
        if (!loopId) {
            return { data: [], error: 'No loop ID' };
        }

        return getSessionHistory(loopId, options);
    }, [loopId]);

    /**
     * 세션 새로고침
     */
    const refreshSession = useCallback(async () => {
        if (!loopId) return;

        const { data, error: fetchError } = await getTodaysLoopSession(loopId);
        if (!fetchError) {
            setTodaysSession(data);
        }
    }, [loopId]);

    return {
        todaysSession,
        loading,
        error,
        hasPrayed: todaysSession?.status === 'prayed' || todaysSession?.prayer_count > 0,
        isCheckinDue: todaysSession?.status === 'checkin_due',
        markAsPrayed,
        requestCheckin,
        completeSession,
        fetchHistory,
        refreshSession,
    };
}
