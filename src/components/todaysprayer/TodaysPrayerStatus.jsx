import { useState, useEffect } from 'react';
import './TodaysPrayerStatus.css';

/**
 * 오늘의 기도 상태 표시 컴포넌트
 *
 * 기도가 진행 중일 때:
 * - 총 기도 횟수와 완료된 횟수
 * - 다음 기도까지 남은 시간
 * - 기도 진행 애니메이션
 */
export function TodaysPrayerStatus({
    todaysPrayer,
    prayerStatus,
    totalPrayers,
    completedPrayers,
    showPrayingAnimation,
    getNextPrayerInfo,
    onNewPrayer,
}) {
    const [nextInfo, setNextInfo] = useState(null);

    // 1분마다 다음 기도 정보 업데이트
    useEffect(() => {
        if (prayerStatus !== 'praying') return;

        const updateNextInfo = () => {
            setNextInfo(getNextPrayerInfo());
        };

        updateNextInfo();
        const interval = setInterval(updateNextInfo, 60000);
        return () => clearInterval(interval);
    }, [prayerStatus, getNextPrayerInfo]);

    // 기도 중 애니메이션
    if (showPrayingAnimation) {
        return (
            <div className="todays-prayer-status praying-animation">
                <div className="praying-icon">🙏</div>
                <div className="praying-text">
                    <p className="praying-title">팔모니가 기도하고 있습니다</p>
                    <p className="praying-topic">"{todaysPrayer?.topic}"</p>
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
    if (prayerStatus === 'praying') {
        return (
            <div className="todays-prayer-status in-progress">
                <div className="status-header">
                    <span className="status-icon">🕊️</span>
                    <span className="status-title">오늘의 기도가 진행 중입니다</span>
                </div>

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

                <p className="prayer-topic-display">
                    "{todaysPrayer?.topic}"
                </p>
            </div>
        );
    }

    // 기도 완료
    if (prayerStatus === 'completed') {
        return (
            <div className="todays-prayer-status completed">
                <div className="status-header">
                    <span className="status-icon">✨</span>
                    <span className="status-title">오늘의 기도가 완료되었습니다</span>
                </div>

                <div className="completed-message">
                    <p>팔모니가 "{todaysPrayer?.topic}"을(를) 위해</p>
                    <p><strong>{totalPrayers}번</strong> 기도했습니다</p>
                </div>

                <p className="tomorrow-message">
                    내일도 기도를 맡겨주세요 🙏
                </p>
            </div>
        );
    }

    // 기도 없음 - 새 기도 유도
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
