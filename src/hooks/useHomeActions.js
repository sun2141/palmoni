import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { checkRateLimit, logUsage, savePrayer, deletePrayer } from '../lib/supabaseClient';
import { savePendingPrayer, getPendingPrayer, clearPendingPrayer, getOrCreateAnonymousId } from '../lib/localStorage';

/**
 * Home 페이지의 기도 생성, 저장, 공유, 로그아웃 등 핵심 액션 훅
 */
export function useHomeActions({ generatePrayer, reset: resetPrayer, setPrayer, addPrayer, toast }) {
    const [topic, setTopic] = useState('');
    const [emotion, setEmotion] = useState('peace');
    const [rateLimitInfo, setRateLimitInfo] = useState(null);
    const [currentPrayerId, setCurrentPrayerId] = useState(null);
    const [showPrayTogether, setShowPrayTogether] = useState(false);

    const { user, signOut, refreshProfile, isInitialized, stateVersion, loading: authLoading } = useAuth();
    const pendingPrayerProcessed = useRef(false);

    const checkUserRateLimit = async () => {
        const userId = user?.id || null;
        const anonymousId = !userId ? getOrCreateAnonymousId() : null;
        const limitInfo = await checkRateLimit(userId, anonymousId);
        setRateLimitInfo(limitInfo);
    };

    // 레이트 리밋 정보 초기 로드 및 갱신
    useEffect(() => {
        if (!authLoading && isInitialized) {
            checkUserRateLimit();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, isInitialized, stateVersion]);

    // 로그인 후 미리보기 기도문 복원 및 저장
    useEffect(() => {
        if (user && isInitialized && !pendingPrayerProcessed.current) {
            const pendingPrayer = getPendingPrayer();
            if (pendingPrayer && pendingPrayer.title && pendingPrayer.content) {
                pendingPrayerProcessed.current = true;

                setTopic(pendingPrayer.topic || '');
                setEmotion(pendingPrayer.emotion || 'peace');
                setPrayer(pendingPrayer.title, pendingPrayer.content);

                (async () => {
                    const saveResult = await savePrayer({
                        userId: user.id,
                        title: pendingPrayer.title,
                        content: pendingPrayer.content,
                        topic: pendingPrayer.topic,
                        emotion: pendingPrayer.emotion,
                        isPublic: false
                    });

                    if (saveResult.data) {
                        setCurrentPrayerId(saveResult.data.id);
                        toast.success('미리보기 기도문이 저장되었습니다!');
                        await logUsage(user.id, null, 'prayer_generation');
                        await refreshProfile();
                    }

                    clearPendingPrayer();
                })();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isInitialized]);

    // 주제에 따른 감정 자동 감지
    useEffect(() => {
        if (!topic) return;

        const lowerTopic = topic.toLowerCase();
        if (lowerTopic.includes('감사') || lowerTopic.includes('기쁨')) {
            setEmotion('gratitude');
        } else if (lowerTopic.includes('슬픔') || lowerTopic.includes('아픔') || lowerTopic.includes('힘들')) {
            setEmotion('sadness');
        } else if (lowerTopic.includes('소망') || lowerTopic.includes('희망')) {
            setEmotion('hope');
        } else {
            setEmotion('peace');
        }
    }, [topic]);

    const handleGenerate = async (setShowLoginModal) => {
        if (!topic.trim() || !generatePrayer) return;

        if (!isInitialized) {
            logger.warn('App not initialized yet, proceeding anyway...');
        }

        const userId = user?.id || null;
        const anonymousId = !userId ? getOrCreateAnonymousId() : null;

        let limitCheck;
        try {
            limitCheck = await checkRateLimit(userId, anonymousId);
        } catch (err) {
            logger.error('Rate limit check failed:', err);
            limitCheck = { allowed: true };
        }

        if (!limitCheck.allowed) {
            toast.warning(limitCheck.message);
            if (!user && setShowLoginModal) {
                setTimeout(() => setShowLoginModal(true), 500);
            }
            return;
        }

        const result = await generatePrayer(topic);

        if (!result || !result.title || !result.content) {
            return;
        }

        await logUsage(userId, anonymousId, 'prayer_generation');

        setTimeout(async () => {
            await checkUserRateLimit();
        }, 500);

        if (userId) {
            await refreshProfile();
        }

        if (userId && result.title && result.content) {
            const saveResult = await savePrayer({
                userId,
                title: result.title,
                content: result.content,
                topic,
                emotion,
                isPublic: false
            });

            if (saveResult.data) {
                setCurrentPrayerId(saveResult.data.id);
            }

            addPrayer({ topic, title: result.title });
            setTimeout(() => setShowPrayTogether(true), 500);

        } else if (!userId && result.title && result.content) {
            setCurrentPrayerId(null);
            savePendingPrayer({ title: result.title, content: result.content, topic, emotion });
            setTimeout(() => setShowPrayTogether(true), 500);
        }
    };

    const handleRegenerate = async (title, content, setShowLoginModal) => {
        if (!topic.trim()) return;
        if (currentPrayerId && user) {
            await deletePrayer(currentPrayerId, user.id);
        }
        await handleGenerate(setShowLoginModal);
    };

    const handleReset = () => {
        setTopic('');
        resetPrayer();
        setCurrentPrayerId(null);
    };

    const handleLogout = async () => {
        if (!isInitialized) {
            toast.warning('앱이 초기화 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        await signOut();
        setRateLimitInfo(null);
        handleReset();
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Palmoni - 기도 앱',
            text: '누군가 당신과 함께 기도합니다. Palmoni에서 기도해보세요!',
            url: 'https://palmoni.vercel.app'
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    await navigator.clipboard.writeText(shareData.url);
                    toast.success('링크가 복사되었습니다!');
                }
            }
        } else {
            await navigator.clipboard.writeText(shareData.url);
            toast.success('링크가 복사되었습니다!');
        }
    };

    return {
        topic,
        setTopic,
        emotion,
        rateLimitInfo,
        currentPrayerId,
        showPrayTogether,
        setShowPrayTogether,
        checkUserRateLimit,
        handleGenerate,
        handleRegenerate,
        handleReset,
        handleLogout,
        handleShare,
    };
}
