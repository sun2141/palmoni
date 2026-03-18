import { useState, useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useAuth } from '../../contexts/AuthContext';
import './TodaysPrayerStatus.css';

/**
 * 오늘의 기도 상태 표시 컴포넌트 (여러 기도 지원)
 *
 * 각 기도가 개별적으로 표시:
 * - 총 기도 횟수와 완료된 횟수
 * - 다음 기도까지 남은 시간
 * - 기도 진행 애니메이션
 * - 알림 권한 요청
 */
export function TodaysPrayerStatus({
    todaysPrayers = [],
    showPrayingAnimation,
    activePrayerIndex,
    getNextPrayerInfo,
    isYesterdayCompleted,
    dismissYesterdayMessage,
}) {
    const { user } = useAuth();
    const { isSupported, permission, requestPermission, canNotify, sendTestNotification } = useNotification();
    const { isSubscribed, isLoading: pushLoading, subscribe: subscribePush } = usePushSubscription();

    // 알림 권한 요청 핸들러 - 권한 획득 시 FCM 구독도 함께 진행
    const handleEnableNotifications = async () => {
        const result = await requestPermission();
        if (result === 'granted') {
            // 테스트 알림 전송
            setTimeout(() => {
                sendTestNotification();
            }, 500);

            // 로그인 사용자는 FCM 백그라운드 푸시도 구독
            if (user) {
                await subscribePush();
            }
        }
    };

    // 어제 기도 완료 메시지
    if (isYesterdayCompleted) {
        return (
            <div className="todays-prayer-status yesterday-completed">
                <div className="status-header">
                    <span className="status-icon">🌙</span>
                    <span className="status-title">어제의 기도가 완료되었습니다</span>
                </div>
                <p className="yesterday-message">
                    팔모니가 어제 하루 동안 당신을 위해 기도했습니다
                </p>
                <button className="dismiss-button" onClick={dismissYesterdayMessage}>
                    확인
                </button>
            </div>
        );
    }

    // 기도가 없으면 안내 메시지
    if (todaysPrayers.length === 0) {
        return (
            <div className="todays-prayer-status idle">
                <div className="idle-content">
                    <span className="idle-icon">🌅</span>
                    <p className="idle-title">오늘의 기도를 맡겨주세요</p>
                    <p className="idle-subtitle">
                        팔모니가 하루 동안 당신을 위해 기도합니다
                    </p>
                </div>
            </div>
        );
    }

    // 여러 기도 표시
    return (
        <div className="todays-prayers-container">
            <div className="prayers-header">
                <span className="prayers-icon">📿</span>
                <span className="prayers-title">오늘의 기도 ({todaysPrayers.length}개)</span>
            </div>

            {/* 알림 권한 요청 배너 */}
            {isSupported && permission === 'default' && todaysPrayers.length > 0 && (
                <div className="notification-prompt">
                    <div className="notification-prompt-content">
                        <span className="notification-icon">🔔</span>
                        <p className="notification-text">
                            알림을 켜면 팔모니가 기도할 때 알려드려요
                        </p>
                    </div>
                    <button className="notification-enable-btn" onClick={handleEnableNotifications}>
                        알림 켜기
                    </button>
                </div>
            )}

            {/* 알림 활성화 상태 표시 */}
            {canNotify && todaysPrayers.some(p => p.status === 'praying') && (
                <div className="notification-active">
                    <span className="notification-active-icon">🔔</span>
                    <span className="notification-active-text">
                        {isSubscribed ? '앱이 꺼져있어도 알림을 보내드려요' : '기도 시간에 알림을 보내드려요'}
                    </span>
                    {user && !isSubscribed && !pushLoading && (
                        <button className="push-upgrade-btn" onClick={subscribePush}>
                            백그라운드 알림 켜기
                        </button>
                    )}
                </div>
            )}

            <div className="prayers-list">
                {todaysPrayers.map((prayer, index) => (
                    <SinglePrayerStatus
                        key={index}
                        prayer={prayer}
                        index={index}
                        showAnimation={showPrayingAnimation && activePrayerIndex === index}
                        getNextPrayerInfo={() => getNextPrayerInfo(index)}
                    />
                ))}
            </div>

            {/* 다음 기도 시간표 */}
            <PrayerSchedulePreview todaysPrayers={todaysPrayers} />
        </div>
    );
}

// 기도 번호별 색상 (부드러운 파스텔 톤)
const PRAYER_COLORS = [
    { bg: 'rgba(108, 71, 255, 0.08)', border: 'rgba(108, 71, 255, 0.2)', accent: '#6C47FF' },  // 보라
    { bg: 'rgba(0, 194, 203, 0.08)', border: 'rgba(0, 194, 203, 0.2)', accent: '#00C2CB' },    // 청록
    { bg: 'rgba(255, 152, 0, 0.08)', border: 'rgba(255, 152, 0, 0.2)', accent: '#FF9800' },    // 주황
];

/**
 * 개별 기도 상태 표시
 */
function SinglePrayerStatus({ prayer, index, showAnimation, getNextPrayerInfo }) {
    const [nextInfo, setNextInfo] = useState(null);
    const { status, currentIndex, times } = prayer;
    const totalPrayers = times.length;
    const completedPrayers = currentIndex;
    const colorScheme = PRAYER_COLORS[index % PRAYER_COLORS.length];

    // 1분마다 다음 기도 정보 업데이트
    useEffect(() => {
        if (status !== 'praying') return;

        const updateNextInfo = () => {
            setNextInfo(getNextPrayerInfo());
        };

        updateNextInfo();
        const interval = setInterval(updateNextInfo, 60000);
        return () => clearInterval(interval);
    }, [status, getNextPrayerInfo]);

    // 인라인 스타일로 색상 적용
    const cardStyle = {
        background: `linear-gradient(135deg, ${colorScheme.bg} 0%, rgba(238, 238, 255, 0.6) 100%)`,
        borderColor: colorScheme.border,
    };

    const numberStyle = {
        background: colorScheme.accent,
    };

    // 기도 중 애니메이션
    if (showAnimation) {
        return (
            <div className="single-prayer-status praying-animation" style={cardStyle}>
                <div className="praying-icon">🙏</div>
                <div className="praying-text">
                    <p className="praying-title" style={{ color: colorScheme.accent }}>팔모니가 기도하고 있습니다</p>
                    <p className="praying-topic">"{prayer.prayer?.topic}"</p>
                </div>
                <div className="praying-waves">
                    <span className="wave" style={{ background: colorScheme.accent }}></span>
                    <span className="wave" style={{ background: colorScheme.accent }}></span>
                    <span className="wave" style={{ background: colorScheme.accent }}></span>
                </div>
            </div>
        );
    }

    // 기도 진행 중
    if (status === 'praying') {
        return (
            <div className="single-prayer-status in-progress" style={cardStyle}>
                <div className="prayer-number" style={numberStyle}>#{index + 1}</div>
                <div className="prayer-content">
                    <p className="prayer-topic-display">
                        "{prayer.prayer?.topic}"
                    </p>
                    <div className="prayer-progress-bar">
                        <div className="progress-track">
                            {Array.from({ length: totalPrayers }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`progress-dot ${i < completedPrayers ? 'completed' : i === completedPrayers ? 'current' : ''}`}
                                    style={i < completedPrayers ? { background: colorScheme.accent } : i === completedPrayers ? { background: colorScheme.accent } : {}}
                                >
                                    {i < completedPrayers ? '✓' : i + 1}
                                </div>
                            ))}
                        </div>
                        <p className="progress-text">
                            {completedPrayers}/{totalPrayers}번째 기도 완료
                        </p>
                    </div>

                    {nextInfo && (
                        <div className="next-prayer-info" style={{ background: colorScheme.bg }}>
                            <span className="next-label">다음 기도까지</span>
                            <span className="next-time" style={{ color: colorScheme.accent }}>{nextInfo.remaining}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 기도 완료
    if (status === 'completed') {
        return (
            <div className="single-prayer-status completed" style={cardStyle}>
                <div className="prayer-number completed" style={numberStyle}>#{index + 1}</div>
                <div className="prayer-content">
                    <p className="prayer-topic-display">
                        "{prayer.prayer?.topic}"
                    </p>
                    <div className="completed-badge">
                        <span className="completed-icon">✨</span>
                        <span className="completed-text">{totalPrayers}번 기도 완료</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

/**
 * 기도 시간표 미리보기
 * 오늘의 모든 기도 시간을 한눈에 볼 수 있게 표시
 */
function PrayerSchedulePreview({ todaysPrayers }) {
    // 진행 중인 기도만 필터링
    const prayingPrayers = todaysPrayers.filter(p => p.status === 'praying');

    if (prayingPrayers.length === 0) return null;

    // 모든 기도의 남은 시간들을 수집
    const upcomingTimes = [];
    const now = new Date();

    prayingPrayers.forEach((prayer, prayerIdx) => {
        prayer.times.forEach((time, timeIdx) => {
            const prayerTime = new Date(time);
            if (prayerTime > now && timeIdx >= prayer.currentIndex) {
                upcomingTimes.push({
                    time: prayerTime,
                    topic: prayer.prayer?.topic || `기도 ${prayerIdx + 1}`,
                    prayerIdx,
                    timeIdx: timeIdx + 1,
                    isNext: timeIdx === prayer.currentIndex,
                });
            }
        });
    });

    // 시간순 정렬
    upcomingTimes.sort((a, b) => a.time - b.time);

    if (upcomingTimes.length === 0) return null;

    // 시간 포맷팅
    const formatTime = (date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="prayer-schedule-preview">
            <div className="schedule-header">
                <span className="schedule-icon">⏰</span>
                <span className="schedule-title">오늘의 기도 시간</span>
            </div>
            <div className="schedule-timeline">
                {upcomingTimes.slice(0, 5).map((item) => {
                    const colorScheme = PRAYER_COLORS[item.prayerIdx % PRAYER_COLORS.length];
                    return (
                        <div
                            key={`${item.prayerIdx}-${item.timeIdx}`}
                            className={`schedule-item ${item.isNext ? 'next' : ''}`}
                            style={{
                                background: item.isNext ? colorScheme.bg : undefined,
                                borderColor: item.isNext ? colorScheme.border : undefined,
                            }}
                        >
                            <div className="schedule-time" style={{ color: colorScheme.accent }}>{formatTime(item.time)}</div>
                            <div className="schedule-dot" style={{ background: colorScheme.accent }}></div>
                            <div className="schedule-topic">
                                {item.topic.length > 15
                                    ? item.topic.substring(0, 15) + '...'
                                    : item.topic}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
