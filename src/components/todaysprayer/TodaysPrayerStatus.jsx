import { useState, useEffect } from 'react';
import './TodaysPrayerStatus.css';

/**
 * 오늘의 기도 상태 표시 컴포넌트 (여러 기도 지원)
 *
 * 각 기도가 개별적으로 표시:
 * - 총 기도 횟수와 완료된 횟수
 * - 다음 기도까지 남은 시간
 * - 기도 진행 애니메이션
 */
export function TodaysPrayerStatus({
    todaysPrayers = [],
    showPrayingAnimation,
    activePrayerIndex,
    getNextPrayerInfo,
    isYesterdayCompleted,
    dismissYesterdayMessage,
}) {
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
        </div>
    );
}

/**
 * 개별 기도 상태 표시
 */
function SinglePrayerStatus({ prayer, index, showAnimation, getNextPrayerInfo }) {
    const [nextInfo, setNextInfo] = useState(null);
    const { status, currentIndex, times } = prayer;
    const totalPrayers = times.length;
    const completedPrayers = currentIndex;

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

    // 기도 중 애니메이션
    if (showAnimation) {
        return (
            <div className="single-prayer-status praying-animation">
                <div className="praying-icon">🙏</div>
                <div className="praying-text">
                    <p className="praying-title">팔모니가 기도하고 있습니다</p>
                    <p className="praying-topic">"{prayer.prayer?.topic}"</p>
                </div>
                <div className="praying-waves">
                    <span className="wave"></span>
                    <span className="wave"></span>
                    <span className="wave"></span>
                </div>
            </div>
        );
    }

    // 기도 진행 중
    if (status === 'praying') {
        return (
            <div className="single-prayer-status in-progress">
                <div className="prayer-number">#{index + 1}</div>
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
                        <div className="next-prayer-info">
                            <span className="next-label">다음 기도까지</span>
                            <span className="next-time">{nextInfo.remaining}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 기도 완료
    if (status === 'completed') {
        return (
            <div className="single-prayer-status completed">
                <div className="prayer-number completed">#{index + 1}</div>
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
