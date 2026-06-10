import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrayerGeneration } from '../hooks/usePrayerGeneration';
import { useTodaysPrayer } from '../hooks/useTodaysPrayer';
import { useActiveUsers } from '../hooks/useActiveUsers';
import { useActivityNotification } from '../hooks/useActivityNotification';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useHomeActions } from '../hooks/useHomeActions';
import { PrayerAmbience } from '../components/prayer/PrayerAmbience';
import { QuickPrayerForm } from '../components/prayer/QuickPrayerForm';
import { PrayerResultCard } from '../components/prayer/PrayerResultCard';
import { LoginModal } from '../components/auth/LoginModal';
import { useAuth } from '../contexts/AuthContext';
import { StreakDisplay } from '../components/streak/StreakDisplay';
import { EmergencyPrayerButton } from '../components/emergency/EmergencyPrayerButton';
import { HomeBottomAd } from '../components/ads/AdBanner';
import { useToast } from '../components/common/Toast';
import { PrayTogetherModal } from '../components/prayer/PrayTogetherModal';
import { SignupPrompt, YesterdayBanner } from '../components/home/SignupPrompt';
import { BottomNav } from '../components/home/BottomNav';
import { logger } from '../lib/logger';
import './Home.css';

export function Home() {
    const [showLoginModal, setShowLoginModal] = useState(false);

    const { user, profile, loading: authLoading } = useAuth();
    const toast = useToast();

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
        todaysPrayerCount,
        showPrayingAnimation,
        isYesterdayCompleted,
        addPrayer,
        startPrayingAnimation,
        stopPrayingAnimation,
        dismissYesterdayMessage,
    } = useTodaysPrayer();

    const activeUsers = useActiveUsers();
    const notification = useActivityNotification();

    const {
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
    } = useHomeActions({
        generatePrayer,
        reset,
        setPrayer,
        addPrayer,
        toast,
    });

    // 기도문 생성 중 애니메이션 시작/종료
    useEffect(() => {
        if (isGenerating) {
            startPrayingAnimation();
        } else {
            stopPrayingAnimation();
        }
    }, [isGenerating, startPrayingAnimation, stopPrayingAnimation]);

    // 오류 발생 시 Toast로 표시
    useEffect(() => {
        if (error) {
            toast.error(error, { duration: 5000 });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    const { containerRef, pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh(async () => {
        try {
            await checkUserRateLimit();
        } catch (err) {
            logger.error('Refresh error:', err);
        }
    });

    return (
        <div
            className="home-container"
            ref={containerRef}
            {...pullHandlers}
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
            <PrayerAmbience isActive={isGenerating || showPrayingAnimation} emotion={emotion} />

            {/* Live notification */}
            {notification && (
                <div className="live-notification">
                    <span className="pulse-dot" />
                    {notification}
                </div>
            )}

            {/* Top bar */}
            <div className="top-bar">
                {authLoading ? null : user ? (
                    <StreakDisplay profile={profile} variant="compact" />
                ) : (
                    <>
                        <button
                            className="top-share-btn"
                            aria-label="앱 공유하기"
                            onClick={handleShare}
                        >
                            📤
                        </button>
                        <button
                            className="start-free-btn"
                            aria-label="로그인 화면 열기"
                            onClick={() => setShowLoginModal(true)}
                        >
                            🌱 로그인하기
                        </button>
                    </>
                )}
            </div>

            {/* Hero Section */}
            <div className="hero-section">
                <span className="hero-icon">🕊️</span>
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
                    누군가 당신과<br />
                    함께 기도합니다
                </p>
            </div>

            {/* 기도 입력 폼 + 애니메이션 */}
            <QuickPrayerForm
                topic={topic}
                onTopicChange={setTopic}
                onGenerate={() => handleGenerate(setShowLoginModal)}
                isGenerating={isGenerating}
                showPrayingAnimation={showPrayingAnimation}
                progress={progress}
                rateLimitInfo={rateLimitInfo}
                user={user}
                todaysPrayerCount={todaysPrayerCount}
            />

            {/* 실시간 사용자 수 */}
            <div className="active-users">
                <span className="active-dot"></span>
                지금 <strong>{activeUsers}명</strong>이 함께 기도하고 있어요
            </div>

            {isYesterdayCompleted && (
                <YesterdayBanner onDismiss={dismissYesterdayMessage} />
            )}

            {!user && (
                <SignupPrompt onLogin={() => setShowLoginModal(true)} />
            )}

            {/* 기도문 결과 카드 */}
            <PrayerResultCard
                title={title}
                content={content}
                user={user}
                currentPrayerId={currentPrayerId}
                isGenerating={isGenerating}
                onRegenerate={() => handleRegenerate(title, content, setShowLoginModal)}
                onReset={handleReset}
            />

            {/* 긴급 기도 버튼 */}
            <EmergencyPrayerButton
                onPrayerGenerated={(prayer) => {
                    setPrayer(prayer.title, prayer.content);
                    setTopic('긴급 기도');
                    toast.success('기도가 준비되었습니다');
                }}
            />

            {user && (
                <BottomNav onLogout={handleLogout} onShare={handleShare} />
            )}

            {/* 광고 배너 */}
            {content && !isGenerating && (
                <HomeBottomAd />
            )}

            {/* 푸터 */}
            <footer className="home-footer">
                <div className="footer-links">
                    <Link to="/privacy">개인정보처리방침</Link>
                    <span className="footer-divider">|</span>
                    <Link to="/terms">이용약관</Link>
                </div>
                <p className="footer-copyright">© 2026 Palmoni. All rights reserved.</p>
            </footer>

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSuccess={() => {
                    setShowLoginModal(false);
                    checkUserRateLimit();
                }}
            />

            {/* 함께 기도하기 모달 */}
            <PrayTogetherModal
                isOpen={showPrayTogether}
                onClose={() => setShowPrayTogether(false)}
                title={title}
                content={content}
                onComplete={() => {
                    setShowPrayTogether(false);
                    toast.success('🙏 함께 기도해주셔서 감사합니다');
                }}
            />
        </div>
    );
}
