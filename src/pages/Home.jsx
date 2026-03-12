import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerGeneration } from '../hooks/usePrayerGeneration';
import { useTodaysPrayer } from '../hooks/useTodaysPrayer';
import { PrayerProgress } from '../components/prayer/PrayerProgress';
import { PrayerAmbience } from '../components/prayer/PrayerAmbience';
import { LoginModal } from '../components/auth/LoginModal';
import { useAuth } from '../contexts/AuthContext';
import { checkRateLimit, logUsage, savePrayer } from '../lib/supabaseClient';
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
    const [saving, setSaving] = useState(false);
    const [currentPrayerId, setCurrentPrayerId] = useState(null);
    const [activeUsers, setActiveUsers] = useState(127);

    const { user, profile, loading: authLoading, signOut } = useAuth();
    const toast = useToast();

    const {
        title,
        content,
        isGenerating,
        error,
        progress,
        generatePrayer,
        reset
    } = usePrayerGeneration();

    const {
        todaysPrayer,
        prayerStatus,
        totalPrayers,
        completedPrayers,
        showPrayingAnimation,
        submitPrayer,
        dismissYesterdayMessage,
        getNextPrayerInfo,
        hasTodaysPrayer,
        isYesterdayCompleted,
    } = useTodaysPrayer();

    useEffect(() => {
        if (!authLoading) {
            checkUserRateLimit();
        }
    }, [user, authLoading]);

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


    const checkUserRateLimit = async () => {
        const userId = user?.id || null;
        const anonymousId = !userId ? getAnonymousId() : null;

        const limitInfo = await checkRateLimit(userId, anonymousId);
        setRateLimitInfo(limitInfo);
    };

    const getAnonymousId = () => {
        const fingerprint = `${navigator.userAgent}_${screen.width}x${screen.height}`;
        return btoa(fingerprint).substring(0, 32);
    };

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        const userId = user?.id || null;
        const anonymousId = !userId ? getAnonymousId() : null;

        const limitCheck = await checkRateLimit(userId, anonymousId);

        if (!limitCheck.allowed) {
            toast.warning(limitCheck.message);
            if (!user) {
                setShowLoginModal(true);
            }
            return;
        }

        const result = await generatePrayer(topic);
        await logUsage(userId, anonymousId, 'prayer_generation');
        await checkUserRateLimit();
        setCurrentPrayerId(null);

        // 오늘의 기도 시스템에 등록
        if (result && result.title && result.content) {
            const prayerInfo = submitPrayer({
                topic,
                title: result.title,
                content: result.content,
                emotion,
            });

            // 기도 횟수 안내
            if (prayerInfo.totalPrayers === 1) {
                // 3시간 미만 남음
                setTimeout(() => {
                    toast.info('자정까지 시간이 얼마 남지 않아 1번 기도합니다. 내일 일찍 기도를 맡겨주시면 하루 종일 기도해드릴게요!', { duration: 5000 });
                }, 1000);
            }
        }
    };

    const handleSavePrayer = async (isPublic = false) => {
        if (!user) {
            toast.info('기도문을 저장하려면 로그인이 필요합니다.');
            setShowLoginModal(true);
            return;
        }

        if (!title || !content) {
            toast.warning('저장할 기도문이 없습니다.');
            return;
        }

        setSaving(true);

        const result = await savePrayer({
            userId: user.id,
            title,
            content,
            topic,
            emotion,
            isPublic
        });

        setSaving(false);

        if (result.error) {
            toast.error(`저장 실패: ${result.error}`);
        } else {
            setCurrentPrayerId(result.data.id);
            toast.success('기도문이 저장되었습니다!');
        }
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
        <div className="home-container">
            {/* Breathing ambience background */}
            <PrayerAmbience isActive={isGenerating} emotion={emotion} />

            {/* Live notification */}
            {notification && (
                <div className="live-notification">
                    <span className="pulse-dot" />
                    {notification}
                </div>
            )}

            {/* Top bar - 무료로 시작하기 버튼 */}
            <div className="top-bar">
                <button
                    className="refresh-btn"
                    onClick={() => window.location.reload()}
                    title="새로고침"
                >
                    🔄
                </button>
                {authLoading ? null : user ? (
                    <div className="user-profile-bar">
                        <StreakDisplay profile={profile} variant="compact" />
                        <button
                            className="my-prayers-btn"
                            onClick={() => navigate('/my-prayers')}
                        >
                            📖 내 기도문
                        </button>
                        <button className="logout-btn-small" onClick={handleLogout}>
                            로그아웃
                        </button>
                    </div>
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
                    {isGenerating ? '🙏 기도하는 중...' : '🙏 기도 맡기기'}
                </button>
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

            {/* 오늘의 기도 상태 */}
            {hasTodaysPrayer && (
                <TodaysPrayerStatus
                    todaysPrayer={todaysPrayer}
                    prayerStatus={prayerStatus}
                    totalPrayers={totalPrayers}
                    completedPrayers={completedPrayers}
                    showPrayingAnimation={showPrayingAnimation}
                    getNextPrayerInfo={getNextPrayerInfo}
                />
            )}

            {/* 회원가입 유도 (비로그인 사용자) */}
            {!user && (
                <div className="signup-prompt">
                    <p>
                        <strong>무료 회원가입</strong>하고 기도문을 저장하고<br />
                        나만의 기도 기록을 관리하세요
                    </p>
                    <button
                        className="signup-cta-btn"
                        onClick={() => setShowLoginModal(true)}
                    >
                        ✨ 회원가입하기
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
                            {user && !currentPrayerId && (
                                <button
                                    className="action-btn"
                                    onClick={() => handleSavePrayer(false)}
                                    disabled={saving}
                                >
                                    <span className="action-icon">💾</span>
                                    <span className="action-text">저장</span>
                                </button>
                            )}
                            {currentPrayerId && (
                                <div className="action-btn saved">
                                    <span className="action-icon">✓</span>
                                    <span className="action-text">저장됨</span>
                                </div>
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
            <EmergencyPrayerButton />

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
