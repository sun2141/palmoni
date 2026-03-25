import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    createCheckin,
    getLastCheckin,
    getCheckinHistory,
} from '../lib/supabaseClient';

/**
 * 체크인 관리 훅
 */
export function useCheckin(loopId, sessionId = null) {
    const { user } = useAuth();
    const [lastCheckin, setLastCheckin] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 마지막 체크인 로드
    useEffect(() => {
        if (!loopId) return;

        const loadLastCheckin = async () => {
            try {
                const { data, error: fetchError } = await getLastCheckin(loopId);
                if (fetchError) {
                    console.error('Failed to load last checkin:', fetchError);
                } else {
                    setLastCheckin(data);
                }
            } catch (e) {
                console.error('Failed to load last checkin:', e);
            }
        };

        loadLastCheckin();
    }, [loopId]);

    /**
     * 체크인 시간인지 확인 (저녁 6시 이후)
     */
    const isCheckinTime = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 18; // 오후 6시 이후
    }, []);

    /**
     * 오늘 체크인했는지 확인
     */
    const hasCheckedInToday = useMemo(() => {
        if (!lastCheckin) return false;

        const checkinDate = new Date(lastCheckin.created_at).toDateString();
        const today = new Date().toDateString();
        return checkinDate === today;
    }, [lastCheckin]);

    /**
     * 체크인이 필요한지 확인
     */
    const isCheckinDue = useMemo(() => {
        return isCheckinTime && !hasCheckedInToday;
    }, [isCheckinTime, hasCheckedInToday]);

    /**
     * 체크인 제출
     */
    const submitCheckin = useCallback(async ({ responseType, nextEmotion = null, note = null }) => {
        if (!user?.id || !loopId || !sessionId) {
            return { data: null, error: 'Missing required data' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: createError } = await createCheckin(
                loopId,
                sessionId,
                user.id,
                { responseType, nextEmotion, note }
            );

            if (createError) {
                setError(createError);
                return { data: null, error: createError };
            }

            setLastCheckin(data);
            return { data, error: null };
        } catch (e) {
            console.error('Failed to submit checkin:', e);
            setError(e.message);
            return { data: null, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id, loopId, sessionId]);

    /**
     * 체크인 히스토리 가져오기
     */
    const fetchHistory = useCallback(async () => {
        if (!loopId) {
            return { data: [], error: 'No loop ID' };
        }

        return getCheckinHistory(loopId);
    }, [loopId]);

    /**
     * 체크인 새로고침
     */
    const refreshCheckin = useCallback(async () => {
        if (!loopId) return;

        const { data, error: fetchError } = await getLastCheckin(loopId);
        if (!fetchError) {
            setLastCheckin(data);
        }
    }, [loopId]);

    return {
        lastCheckin,
        loading,
        error,
        isCheckinTime,
        isCheckinDue,
        hasCheckedInToday,
        submitCheckin,
        fetchHistory,
        refreshCheckin,
    };
}
