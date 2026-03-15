import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerGeneration } from '../hooks/usePrayerGeneration';
import { useTodaysPrayer } from '../hooks/useTodaysPrayer';
import { PrayerProgress } from '../components/prayer/PrayerProgress';
import { PrayerAmbience } from '../components/prayer/PrayerAmbience';
import { LoginModal } from '../components/auth/LoginModal';
import { useAuth } from '../contexts/AuthContext';
import { checkRateLimit, logUsage, savePrayer, deletePrayer } from '../lib/supabaseClient';
import { savePendingPrayer, getPendingPrayer, clearPendingPrayer, getOrCreateAnonymousId } from '../lib/localStorage';
import { StreakDisplay } from '../components/streak/StreakDisplay';
import { EmergencyPrayerButton } from '../components/emergency/EmergencyPrayerButton';
import { TodaysPrayerStatus } from '../components/todaysprayer/TodaysPrayerStatus';
import { useToast } from '../components/common/Toast';
import './Home.css';

export function Home() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [notification, setNotification] = useState(null);
    const [emotion, setEmotion] = useState('peace');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [rateLimitInfo, setRateLimitInfo] = useState(null);
    const [currentPrayerId, setCurrentPrayerId] = useState(null);
    const [activeUsers, setActiveUsers] = useState(127);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef(null);
    const touchStartY = useRef(0);
    const isPulling = useRef(false);

    const { user, profile, loading: authLoading, signOut, refreshProfile, setOnLoginSuccess, isInitialized } = useAuth();
    const toast = useToast();
    const pendingPrayerProcessed = useRef(false);

    const {
        title,
        content,
        isGenerating,
        error,
        progress,
        generatePrayer,
        reset,
        setPrayer
    } = usePrayerGeneration();

    const {
        todaysPrayers,
        showPrayingAnimation,
        activePrayerIndex,
        submitPrayer,
        dismissYesterdayMessage,
        getNextPrayerInfo,
        hasTodaysPrayer,
        isYesterdayCompleted,
    } = useTodaysPrayer();

    useEffect(() => {
        if (!authLoading && isInitialized) {
            checkUserRateLimit();
        }
    }, [user, authLoading, isInitialized]);

    // 로그인 후 미리보기 기도문 복원 및 저장
    useEffect(() => {
        if (user && isInitialized && !pendingPrayerProcessed.current) {
            const pendingPrayer = getPendingPrayer();
            if (pendingPrayer && pendingPrayer.title && pendingPrayer.content) {
                pendingPrayerProcessed.current = true;

                // 기존 기도문 표시
                setTopic(pendingPrayer.topic || '');
                setEmotion(pendingPrayer.emotion || 'peace');
                setPrayer(pendingPrayer.title, pendingPrayer.content);

                // 자동 저장
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

                        // 로그 사용량 기록 및 스트릭 업데이트
                        await logUsage(user.id, null, 'prayer_generation');
                        await refreshProfile();
                    }

                    // 임시 저장 삭제
                    clearPendingPrayer();
                })();
            }
        }
    }, [user, isInitialized, setPrayer]);

    // 실시간 사용자 수 시뮬레이션
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveUsers(prev => {
                const change = Math.floor(Math.random() * 11) - 5;
                return Math.max(80, Math.min(200, prev + change));
            });
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await fetch('/api/background-activities');
                if (response.ok) {
                    const data = await response.json();
                    setNotification(data.message);
                    setTimeout(() => setNotification(null), 6000);
                }
            } catch (error) {
                console.error('Error fetching activity:', error);
            }
        };

        const timer = setInterval(() => {
            if (Math.random() > 0.6) {
                fetchActivity();
            }
        }, 12000);

        return () => clearInterval(timer);
    }, []);

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

    // Pull-to-Refresh 핸들러
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshProfile();
            await checkUserRateLimit();
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            setIsRefreshing(false);
            setPullDistance(0);
        }
    }, [refreshProfile]);

    const handleTouchStart = useCallback((e) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling.current) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            setPullDistance(Math.min(diff * 0.5, 80));
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (pullDistance > 60) {
            handleRefresh();
        } else {
            setPullDistance(0);
        }
        isPulling.current = false;
    }, [pullDistance, handleRefresh]);

    const checkUserRateLimit = async () => {
        const userId = user?.id || null;
        const anonymousId = !userId ? getAnonymousId() : null;

        const limitInfo = await checkRateLimit(userId, anonymousId);
        setRateLimitInfo(limitInfo);
    };

    const getAnonymousId = () => {
        return getOrCreateAnonymousId();
    };

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        const userId = user?.id || null;
        const anonymousId = !userId ? getAnonymousId() : null;

        const limitCheck = await checkRateLimit(userId, anonymousId);

        if (!limitCheck.allowed) {
            toast.warning(limitCheck.message);
            if (!user) {
                setTimeout(() => setShowLoginModal(true), 500);
            }
            return;
        }

        const result = await generatePrayer(topic);

        // 오류 발생 시 usage 차감하지 않음
        if (!result || !result.title || !result.content) {
            return;
        }

        await logUsage(userId, anonymousId, 'prayer_generation');

        // 짧은 딜레이 후 rate limit 다시 체크 (DB 반영 대기)
        setTimeout(async () => {
            await checkUserRateLimit();
        }, 500);

        // 프로필(스트릭) 새로고침
        if (userId) {
            await refreshProfile();
        }

        // 로그인 사용자: 자동 저장 + 기도맡기기
        if (userId && result && result.title && result.content) {
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
                toast.success(`기도가 저장되었습니다! (오늘 ${limitCheck.used + 1}/${limitCheck.limit}회)`);
            }

            // 오늘의 기도 시스템에 등록 (로그인 사용자만)
            const prayerInfo = submitPrayer({
                topic,
                title: result.title,
                content: result.content,
                emotion,
            });

            if (prayerInfo.totalPrayers === 1) {
                setTimeout(() => {
                    toast.info('자정까지 시간이 얼마 남지 않아 1번 기도합니다. 내일 일찍 기도를 맡겨주시면 하루 종일 기도해드릴게요!', { duration: 5000 });
                }, 1000);
            }
        } else if (!userId && result && result.title && result.content) {
            // 비로그인 사용자: 미리보기만 (저장 안됨) + 임시 저장
            setCurrentPrayerId(null);

            // 로컬에 임시 저장 (로그인 후 복원용)
            savePendingPrayer({
                title: result.title,
                content: result.content,
                topic,
                emotion
            });

            setTimeout(() => {
                toast.info('회원가입하시면 기도문이 저장되고, 하루 종일 기도를 대신해드립니다!', { duration: 4000 });
            }, 1500);
        }
    };

    // 기도문 다시 생성 (기존 기도문 삭제 후 재생성)
    const handleRegenerate = async () => {
        if (!topic.trim()) return;

        // 기존 저장된 기도문 삭제
        if (currentPrayerId && user) {
            await deletePrayer(currentPrayerId, user.id);
        }

        // 새로 생성
        await handleGenerate();
    };

    const handleReset = () => {
        setTopic('');
        reset();
        setCurrentPrayerId(null);
    };

    const handleLogout = async () => {
        await signOut();
        setRateLimitInfo(null);
        handleReset();
    };


    return (
        <div
            className="home-container"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull-to-Refresh 인디케이터 */}
            {(pullDistance > 0 || isRefreshing) && (
                <div
                    className="pull-refresh-indicator"
                    style={{ height: isRefreshing ? 50 : pullDistance }}
                >
                    <div className={`refresh-spinner ${isRefreshing ? 'spinning' : ''}`}>
                        {isRefreshing ? '🙏' : pullDistance > 60 ? '↓ 놓으면 새로고침' : '↓ 당겨서 새로고침'}
                    </div>
                </div>
            )}

            {/* Breathing ambience background */}
            <PrayerAmbience isActive={isGenerating} emotion={emotion} />

            {/* Live notification */}
            {notification && (
                <div className="live-notification">
                    <span className="pulse-dot" />
                    {notification}
                </div>
            )}

            {/* Top bar - 스트릭 표시 (로그인 시) 또는 무료로 시작하기 버튼 */}
            <div className="top-bar">
                {authLoading ? null : user ? (
                    <StreakDisplay profile={profile} variant="compact" />
                ) : (
                    <button className="start-free-btn" onClick={() => setShowLoginModal(true)}>
                        🌱 무료로 시작하기
                    </button>
                )}
            </div>

            {/* Hero Section */}
            <div className="hero-section">
                <span className="hero-icon">🍄</span>
                <h1
                    className="hero-title clickable"
                    onClick={() => {
                        handleReset();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title="홈으로"
                >
                    PALMONI
                </h1>
                <p className="hero-subtitle">
                    이름 없는 존재가<br />
                    당신을 위해 기도합니다
                </p>
            </div>

            {/* Progress indicator */}
            {isGenerating && progress > 0 && (
                <PrayerProgress currentStep={progress} />
            )}

            {/* Input Section - 시안 스타일 */}
            <div className="prayer-input-section">
                <div className="input-header">
                    <span className="input-icon">✏️</span>
                    <span className="input-label">오늘의 기도</span>
                </div>
                <textarea
                    className="prayer-textarea"
                    placeholder="마음에 담긴 이야기를 나눠주세요..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating}
                    rows={3}
                />
                <button
                    className="pray-cta-btn"
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                >
                    {isGenerating ? '🙏 기도하는 중...' : user ? '🙏 기도 맡기기' : '🙏 기도문 미리보기'}
                </button>
                {rateLimitInfo && user && (
                    <div className="remaining-count">
                        오늘 남은 횟수: <strong>{rateLimitInfo.remaining || 0}</strong>/{rateLimitInfo.limit || 3}회
                    </div>
                )}
            </div>

            {/* 실시간 사용자 수 */}
            <div className="active-users">
                <span className="active-dot"></span>
                지금 <strong>{activeUsers}명</strong>이 함께 기도하고 있어요
            </div>

            {/* 어제 기도 완료 배너 */}
            {isYesterdayCompleted && (
                <div className="yesterday-banner">
                    <div className="yesterday-content">
                        <span className="yesterday-icon">✨</span>
                        <span className="yesterday-text">
                            <strong>어제의 기도가 완료되었습니다</strong>
                            오늘도 기도를 맡겨주세요
                        </span>
                    </div>
                    <button className="yesterday-dismiss" onClick={dismissYesterdayMessage}>
                        확인
                    </button>
                </div>
            )}

            {/* 오늘의 기도 상태 (여러 기도 지원) */}
            {(hasTodaysPrayer || isYesterdayCompleted) && (
                <TodaysPrayerStatus
                    todaysPrayers={todaysPrayers}
                    showPrayingAnimation={showPrayingAnimation}
                    activePrayerIndex={activePrayerIndex}
                    getNextPrayerInfo={getNextPrayerInfo}
                    isYesterdayCompleted={isYesterdayCompleted}
                    dismissYesterdayMessage={dismissYesterdayMessage}
                />
            )}

            {/* 회원가입 유도 (비로그인 사용자) */}
            {!user && (
                <div className="signup-prompt">
                    <p>
                        <strong>무료 회원가입</strong>하시면<br />
                        기도문이 저장되고, 하루 종일 기도를 대신해드립니다
                    </p>
                    <div className="signup-benefits">
                        <span className="benefit-item">✓ 매일 3회 기도맡기기</span>
                        <span className="benefit-item">✓ 기도문 자동 저장</span>
                        <span className="benefit-item">✓ 연속 기도 기록</span>
                    </div>
                    <button
                        className="signup-cta-btn"
                        onClick={() => setShowLoginModal(true)}
                    >
                        ✨ 무료로 시작하기
                    </button>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Prayer result - 시안 스타일 */}
            {(title || content) && (
                <div className="prayer-result-card">
                    <div className="result-header">
                        <span className="result-icon">✨</span>
                        <span className="result-label">오늘의 기도</span>
                    </div>

                    {title && <h2 className="result-title">{title}</h2>}

                    {content && (
                        <div className="result-content">
                            {content}
                        </div>
                    )}

                    {!isGenerating && (title || content) && (
                        <div className="result-actions">
                            {user && currentPrayerId && (
                                <button
                                    className="action-btn"
                                    onClick={handleRegenerate}
                                    disabled={isGenerating}
                                >
                                    <span className="action-icon">🔄</span>
                                    <span className="action-text">다시 생성</span>
                                </button>
                            )}
                            <button
                                className="action-btn"
                                onClick={async () => {
                                    const text = `${title}\n\n${content}\n\n- Palmoni가 당신을 위해 기도했습니다`;
                                    await navigator.clipboard.writeText(text);
                                    toast.success('기도문이 복사되었습니다!');
                                }}
                            >
                                <span className="action-icon">📋</span>
                                <span className="action-text">복사</span>
                            </button>
                            <button
                                className="action-btn"
                                onClick={async () => {
                                    const shareText = `${title}\n\n${content}`;
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({ title, text: shareText });
                                        } catch (err) {
                                            console.log('Share cancelled');
                                        }
                                    } else {
                                        await navigator.clipboard.writeText(shareText);
                                        toast.success('기도문이 복사되었습니다!');
                                    }
                                }}
                            >
                                <span className="action-icon">📤</span>
                                <span className="action-text">공유</span>
                            </button>
                            <button className="action-btn" onClick={handleReset}>
                                <span className="action-icon">🙏</span>
                                <span className="action-text">새 기도</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 긴급 기도 버튼 */}
            <EmergencyPrayerButton
                onPrayerGenerated={(prayer) => {
                    // 긴급 기도문을 메인 화면에 표시
                    setPrayer(prayer.title, prayer.content);
                    setTopic('긴급 기도');
                    setCurrentPrayerId(null); // 긴급 기도는 저장 안함
                    toast.success('기도가 준비되었습니다');
                }}
            />

            {/* 하단 네비게이션 (로그인 시) */}
            {user && (
                <div className="bottom-nav">
                    <button
                        className="bottom-nav-btn"
                        onClick={() => navigate('/my-prayers')}
                    >
                        <span className="nav-icon">📖</span>
                        <span className="nav-text">내 기도문</span>
                    </button>
                    <button className="bottom-nav-btn logout" onClick={handleLogout}>
                        <span className="nav-icon">👋</span>
                        <span className="nav-text">로그아웃</span>
                    </button>
                </div>
            )}

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSuccess={() => {
                    setShowLoginModal(false);
                    checkUserRateLimit();
                }}
            />
        </div>
    );
}
