import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerGeneration } from '../hooks/usePrayerGeneration';
import { PrayerProgress } from '../components/prayer/PrayerProgress';
import { PrayerAmbience } from '../components/prayer/PrayerAmbience';
import { LoginModal } from '../components/auth/LoginModal';
import { useAuth } from '../contexts/AuthContext';
import { checkRateLimit, logUsage, savePrayer } from '../lib/supabaseClient';
import { UpgradeBanner } from '../components/UpgradeBanner';
import { PdfDownloadButton } from '../components/pdf/PdfDownloadButton';
import { TtsButton } from '../components/tts/TtsButton';
import { StreakDisplay } from '../components/streak/StreakDisplay';
import { VoiceInput } from '../components/voice/VoiceInput';
import { EmergencyPrayerButton } from '../components/emergency/EmergencyPrayerButton';
import { PrayerDashboard } from '../components/schedule/PrayerDashboard';
import { PrayerNotification } from '../components/schedule/PrayerNotification';
import { usePrayerCompanion } from '../hooks/usePrayerCompanion';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
    const { currentPrayer: companionPrayer, nextPrayerTime, unviewedPrayers } = usePrayerCompanion();

    const {
        title,
        content,
        isGenerating,
        error,
        progress,
        generatePrayer,
        reset
    } = usePrayerGeneration();

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (params.get('donation_success') === 'true') {
            const amount = params.get('amount');
            alert(`후원해주셔서 감사합니다! 💝\n${amount ? `₩${parseInt(amount).toLocaleString()}` : ''}\n더 나은 서비스로 보답하겠습니다.`);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (params.get('donation_canceled') === 'true') {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

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
            alert(limitCheck.message);
            if (!user) {
                setShowLoginModal(true);
            }
            return;
        }

        await generatePrayer(topic);
        await logUsage(userId, anonymousId, 'prayer_generation');
        await checkUserRateLimit();
        setCurrentPrayerId(null);
    };

    const handleSavePrayer = async (isPublic = false) => {
        if (!user) {
            alert('기도문을 저장하려면 로그인이 필요합니다.');
            setShowLoginModal(true);
            return;
        }

        if (!title || !content) {
            alert('저장할 기도문이 없습니다.');
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
            alert(`저장 실패: ${result.error}`);
        } else {
            setCurrentPrayerId(result.data.id);
            alert('기도문이 저장되었습니다!');
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

    const handleVoiceTranscript = (transcript, isFinal) => {
        setTopic(transcript);
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
                <div className="hero-icon">🍄</div>
                <h1 className="hero-title">PALMONI</h1>
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
                    <VoiceInput onTranscript={handleVoiceTranscript} />
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
                    {isGenerating ? '🙏 기도하는 중...' : '🔥 기도 맡기기'}
                </button>
            </div>

            {/* 실시간 사용자 수 */}
            <div className="active-users">
                <span className="active-dot"></span>
                지금 <strong>{activeUsers}명</strong>이 함께 기도하고 있어요
            </div>

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

            {/* Upgrade banner */}
            <UpgradeBanner profile={profile} rateLimitInfo={rateLimitInfo} />

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
                            <PdfDownloadButton
                                prayer={{
                                    title,
                                    content,
                                    topic,
                                    emotion,
                                    created_at: new Date().toISOString()
                                }}
                                variant="icon"
                            />
                            <TtsButton text={content} variant="icon" />
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

            {/* 기도 동반자 대시보드 - 로그인 사용자만 */}
            {user && (
                <PrayerDashboard />
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

            {/* 실시간 기도 알림 (화면 하단 고정) */}
            <PrayerNotification
                prayer={companionPrayer}
                onDismiss={() => {}}
            />
        </div>
    );
}
