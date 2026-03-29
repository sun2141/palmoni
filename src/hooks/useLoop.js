import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    createLoop as createLoopApi,
    getActiveLoops,
    getLoopById,
    updateLoopStatus,
    updateLoopEmotion,
    getLoopHistory,
    createSession,
    getTodaysLoopSession,
} from '../lib/supabaseClient';

/**
 * 최대 활성 루프 개수
 */
const MAX_ACTIVE_LOOPS = 3;

/**
 * 상태 전이 규칙
 */
const STATE_TRANSITIONS = {
    active: ['checkin_due'],
    checkin_due: ['continued', 'completed', 'snoozed'],
    continued: ['active'],
    completed: [],
    snoozed: ['active'],
};

/**
 * 기도 여정(Loop) 관리 훅
 */
export function useLoop() {
    const { user } = useAuth();
    const [activeLoops, setActiveLoops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initialLoadDone = useRef(false);
    const previousUserId = useRef(user?.id);

    // 로그아웃/로그인 감지
    useEffect(() => {
        const prevId = previousUserId.current;
        const currId = user?.id;

        if (prevId && !currId) {
            // 로그아웃
            setActiveLoops([]);
            initialLoadDone.current = false;
        }

        if (currId && prevId !== currId) {
            // 다른 계정 로그인
            setActiveLoops([]);
            initialLoadDone.current = false;
        }

        previousUserId.current = currId;
    }, [user]);

    // 활성 루프 로드
    useEffect(() => {
        console.log('[useLoop] effect triggered, user?.id:', user?.id, 'initialLoadDone:', initialLoadDone.current);

        // user가 없으면 loading을 false로 설정하고 종료
        if (!user?.id) {
            console.log('[useLoop] No user, setting loading to false');
            setLoading(false);
            return;
        }

        // 이미 로드했으면 loading만 false로 설정하고 스킵
        if (initialLoadDone.current) {
            console.log('[useLoop] Already loaded, setting loading to false');
            setLoading(false);
            return;
        }

        const loadActiveLoops = async () => {
            console.log('[useLoop] Starting to load active loops for user:', user.id);
            setLoading(true);

            // 타임아웃 설정 (5초 후 강제 완료)
            const timeout = setTimeout(() => {
                console.warn('[useLoop] API call timeout, forcing completion');
                setLoading(false);
                initialLoadDone.current = true;
            }, 5000);

            try {
                const { data, error: fetchError } = await getActiveLoops(user.id);
                clearTimeout(timeout);
                console.log('[useLoop] getActiveLoops result:', { data, error: fetchError });
                if (fetchError) {
                    setError(fetchError);
                } else {
                    setActiveLoops(data || []);
                }
            } catch (e) {
                clearTimeout(timeout);
                console.error('[useLoop] Failed to load active loops:', e);
                setError(e.message);
            } finally {
                console.log('[useLoop] Load complete, setting loading to false');
                setLoading(false);
                initialLoadDone.current = true;
            }
        };

        loadActiveLoops();
    }, [user?.id]);

    /**
     * 새 기도 여정 생성
     */
    const createLoop = useCallback(async ({ title, topic, emotion, continuePrayer = true }) => {
        if (!user?.id) {
            return { data: null, error: 'User not logged in' };
        }

        // 최대 개수 체크
        if (activeLoops.length >= MAX_ACTIVE_LOOPS) {
            return { data: null, error: `최대 ${MAX_ACTIVE_LOOPS}개의 매일 기도만 진행할 수 있습니다.` };
        }

        setLoading(true);
        setError(null);

        try {
            // 1. 루프 생성
            const { data: loop, error: loopError } = await createLoopApi(user.id, {
                title,
                topic,
                emotion,
                continuePrayer,
            });

            if (loopError) {
                setError(loopError);
                return { data: null, error: loopError };
            }

            // 2. 첫 번째 세션 생성
            const { data: session, error: sessionError } = await createSession(
                loop.id,
                user.id,
                { dayNumber: 1, emotion }
            );

            if (sessionError) {
                console.error('Failed to create first session:', sessionError);
            }

            setActiveLoops(prev => [loop, ...prev]);
            return { data: { loop, session }, error: null };
        } catch (e) {
            console.error('Failed to create loop:', e);
            setError(e.message);
            return { data: null, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id, activeLoops.length]);

    /**
     * 루프 상세 가져오기
     */
    const getLoop = useCallback(async (loopId) => {
        try {
            const { data, error: fetchError } = await getLoopById(loopId);
            if (fetchError) {
                return { data: null, error: fetchError };
            }
            return { data, error: null };
        } catch (e) {
            console.error('Failed to get loop:', e);
            return { data: null, error: e.message };
        }
    }, []);

    /**
     * 상태 전이 (상태 머신)
     */
    const transitionTo = useCallback(async (loopId, newStatus, additionalData = {}) => {
        // 현재 루프 상태 확인
        const { data: currentLoop, error: fetchError } = await getLoopById(loopId);
        if (fetchError || !currentLoop) {
            return { data: null, error: 'Loop not found' };
        }

        // 전이 가능 여부 확인
        const allowedTransitions = STATE_TRANSITIONS[currentLoop.status] || [];
        if (!allowedTransitions.includes(newStatus)) {
            console.warn(`Invalid transition: ${currentLoop.status} -> ${newStatus}`);
            return { data: null, error: `Cannot transition from ${currentLoop.status} to ${newStatus}` };
        }

        // 상태 업데이트
        const { data, error: updateError } = await updateLoopStatus(loopId, newStatus, additionalData);
        if (updateError) {
            return { data: null, error: updateError };
        }

        // 활성 루프 목록 업데이트
        setActiveLoops(prev => {
            // completed나 snoozed면 목록에서 제거
            if (newStatus === 'completed' || newStatus === 'snoozed') {
                return prev.filter(loop => loop.id !== loopId);
            }
            // 그 외에는 업데이트
            return prev.map(loop => loop.id === loopId ? data : loop);
        });

        return { data, error: null };
    }, []);

    /**
     * 체크인 완료 후 상태 처리
     */
    const handleCheckinComplete = useCallback(async (loopId, responseType, nextEmotion = null) => {
        let newStatus;
        const additionalData = {};

        switch (responseType) {
            case 'continue':
            case 'change_emotion':
                newStatus = 'continued';
                if (nextEmotion) {
                    additionalData.current_emotion = nextEmotion;
                }
                break;
            case 'complete':
                newStatus = 'completed';
                break;
            case 'snooze':
                newStatus = 'snoozed';
                break;
            default:
                return { data: null, error: 'Invalid response type' };
        }

        return transitionTo(loopId, newStatus, additionalData);
    }, [transitionTo]);

    /**
     * 감정 변경
     */
    const changeEmotion = useCallback(async (loopId, emotion) => {
        const { data, error: updateError } = await updateLoopEmotion(loopId, emotion);
        if (updateError) {
            return { data: null, error: updateError };
        }

        setActiveLoops(prev => prev.map(loop => loop.id === loopId ? data : loop));

        return { data, error: null };
    }, []);

    /**
     * 히스토리 가져오기
     */
    const fetchHistory = useCallback(async (options = {}) => {
        if (!user?.id) {
            return { data: [], error: 'User not logged in', count: 0 };
        }

        return getLoopHistory(user.id, options);
    }, [user?.id]);

    /**
     * 루프 다시 시작 (snoozed -> active)
     */
    const resumeLoop = useCallback(async (loopId) => {
        // 최대 개수 체크
        if (activeLoops.length >= MAX_ACTIVE_LOOPS) {
            return { data: null, error: `최대 ${MAX_ACTIVE_LOOPS}개의 매일 기도만 진행할 수 있습니다.` };
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. 현재 루프 정보 가져오기
        const { data: currentLoop, error: fetchError } = await getLoopById(loopId);
        if (fetchError || !currentLoop) {
            return { data: null, error: 'Loop not found' };
        }

        const newDayNumber = (currentLoop.total_days || 0) + 1;

        // 2. 루프 상태 active로 변경 + total_days 증가 (한 번에)
        const { data: loop, error: loopError } = await updateLoopStatus(loopId, 'active', {
            total_days: newDayNumber,
            last_session_date: today,
        });

        if (loopError) {
            return { data: null, error: loopError };
        }

        // 3. 새 세션 생성 (createSession 내부에서 중복 체크함)
        const { data: session, error: sessionError } = await createSession(
            loopId,
            user.id,
            {
                dayNumber: newDayNumber,
                emotion: currentLoop.current_emotion,
            }
        );

        if (sessionError) {
            console.error('Failed to create session on resume:', sessionError);
        }

        // 4. 활성 루프 목록에 추가
        setActiveLoops(prev => [loop, ...prev.filter(l => l.id !== loopId)]);

        return { data: { loop, session }, error: null };
    }, [user?.id, activeLoops.length]);

    /**
     * 활성 루프 새로고침
     */
    const refreshActiveLoops = useCallback(async () => {
        if (!user?.id) return;

        const { data, error: fetchError } = await getActiveLoops(user.id);
        if (!fetchError) {
            setActiveLoops(data || []);
        }
    }, [user?.id]);

    /**
     * 기존 기도문으로 매일 기도 시작
     * @param {Object} prayer - 기도문 객체 { title, topic, content, emotion }
     */
    const createLoopFromPrayer = useCallback(async (prayer) => {
        if (!user?.id) {
            return { data: null, error: 'User not logged in' };
        }

        // 최대 개수 체크
        if (activeLoops.length >= MAX_ACTIVE_LOOPS) {
            return { data: null, error: `최대 ${MAX_ACTIVE_LOOPS}개의 매일 기도만 진행할 수 있습니다.` };
        }

        setLoading(true);
        setError(null);

        try {
            // 1. 루프 생성
            const { data: loop, error: loopError } = await createLoopApi(user.id, {
                title: prayer.title || '매일 기도',
                topic: prayer.topic,
                emotion: prayer.emotion || 'peace',
                continuePrayer: true,
            });

            if (loopError) {
                setError(loopError);
                return { data: null, error: loopError };
            }

            // 2. 첫 번째 세션 생성 (기존 기도문 내용 포함)
            const { data: session, error: sessionError } = await createSession(
                loop.id,
                user.id,
                {
                    dayNumber: 1,
                    emotion: prayer.emotion || 'peace',
                    prayerTitle: prayer.title,
                    prayerContent: prayer.content,
                }
            );

            if (sessionError) {
                console.error('Failed to create first session:', sessionError);
            }

            setActiveLoops(prev => [loop, ...prev]);
            return { data: { loop, session }, error: null };
        } catch (e) {
            console.error('Failed to create loop from prayer:', e);
            setError(e.message);
            return { data: null, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id, activeLoops.length]);

    return {
        // 복수형 (새로운 API)
        activeLoops,
        activeLoopCount: activeLoops.length,
        canCreateLoop: activeLoops.length < MAX_ACTIVE_LOOPS,
        maxLoops: MAX_ACTIVE_LOOPS,

        // 단수형 (하위 호환성 - 첫 번째 루프 반환)
        activeLoop: activeLoops[0] || null,
        hasActiveLoop: activeLoops.length > 0,

        loading,
        error,
        createLoop,
        createLoopFromPrayer,
        getLoop,
        transitionTo,
        handleCheckinComplete,
        changeEmotion,
        fetchHistory,
        resumeLoop,
        refreshActiveLoop: refreshActiveLoops, // 하위 호환성
        refreshActiveLoops,
    };
}
