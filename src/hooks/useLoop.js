import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    createLoop as createLoopApi,
    getActiveLoop,
    getLoopById,
    updateLoopStatus,
    updateLoopEmotion,
    getLoopHistory,
    createSession,
    getTodaysLoopSession,
} from '../lib/supabaseClient';

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
    const [activeLoop, setActiveLoop] = useState(null);
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
            setActiveLoop(null);
            initialLoadDone.current = false;
        }

        if (currId && prevId !== currId) {
            // 다른 계정 로그인
            setActiveLoop(null);
            initialLoadDone.current = false;
        }

        previousUserId.current = currId;
    }, [user]);

    // 활성 루프 로드
    useEffect(() => {
        // user가 없으면 loading을 false로 설정하고 종료
        if (!user?.id) {
            setLoading(false);
            return;
        }

        // 이미 로드했으면 loading만 false로 설정하고 스킵
        if (initialLoadDone.current) {
            setLoading(false);
            return;
        }

        const loadActiveLoop = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await getActiveLoop(user.id);
                if (fetchError) {
                    setError(fetchError);
                } else {
                    setActiveLoop(data);
                }
            } catch (e) {
                console.error('Failed to load active loop:', e);
                setError(e.message);
            } finally {
                setLoading(false);
                initialLoadDone.current = true;
            }
        };

        loadActiveLoop();
    }, [user?.id]);

    /**
     * 새 기도 여정 생성
     */
    const createLoop = useCallback(async ({ title, topic, emotion, continuePrayer = true }) => {
        if (!user?.id) {
            return { data: null, error: 'User not logged in' };
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

            setActiveLoop(loop);
            return { data: { loop, session }, error: null };
        } catch (e) {
            console.error('Failed to create loop:', e);
            setError(e.message);
            return { data: null, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

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

        // 활성 루프 업데이트
        if (activeLoop?.id === loopId) {
            setActiveLoop(data);
        }

        return { data, error: null };
    }, [activeLoop?.id]);

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

        if (activeLoop?.id === loopId) {
            setActiveLoop(data);
        }

        return { data, error: null };
    }, [activeLoop?.id]);

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
        const today = new Date().toISOString().split('T')[0];

        // 1. 루프 상태 active로 변경
        const { data: loop, error: loopError } = await transitionTo(loopId, 'active');
        if (loopError) {
            return { data: null, error: loopError };
        }

        // 2. 새 세션 생성
        const { data: session, error: sessionError } = await createSession(
            loopId,
            user.id,
            {
                dayNumber: loop.total_days + 1,
                emotion: loop.current_emotion,
            }
        );

        if (sessionError) {
            console.error('Failed to create session on resume:', sessionError);
        }

        // 3. total_days 증가
        await updateLoopStatus(loopId, 'active', {
            total_days: loop.total_days + 1,
            last_session_date: today,
        });

        return { data: { loop, session }, error: null };
    }, [user?.id, transitionTo]);

    /**
     * 활성 루프 새로고침
     */
    const refreshActiveLoop = useCallback(async () => {
        if (!user?.id) return;

        const { data, error: fetchError } = await getActiveLoop(user.id);
        if (!fetchError) {
            setActiveLoop(data);
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

        // 이미 활성 루프가 있으면 에러
        if (activeLoop) {
            return { data: null, error: '이미 진행 중인 매일 기도가 있습니다.' };
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

            setActiveLoop(loop);
            return { data: { loop, session }, error: null };
        } catch (e) {
            console.error('Failed to create loop from prayer:', e);
            setError(e.message);
            return { data: null, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id, activeLoop]);

    return {
        activeLoop,
        hasActiveLoop: !!activeLoop,
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
        refreshActiveLoop,
    };
}
