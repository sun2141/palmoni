import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoop } from '../../hooks/useLoop';
import { useSession } from '../../hooks/useSession';
import { useCheckin } from '../../hooks/useCheckin';
import { LoopStatusBadge } from '../../components/loop/LoopStatusBadge';
import { EmotionBadge } from '../../components/loop/EmotionSelector';
import { CheckinBottomSheet } from '../../components/loop/CheckinBottomSheet';
import { CheckinResult } from '../../components/loop/CheckinResult';
import { PrayTogetherModal } from '../../components/prayer/PrayTogetherModal';
import './LoopDetail.css';

/**
 * 기도 여정 상세 페이지 (Screen B)
 */
export default function LoopDetail() {
    const { loopId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getLoop, handleCheckinComplete, transitionTo, refreshActiveLoop } = useLoop();

    const [loop, setLoop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 기도 생성 상태
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPrayer, setGeneratedPrayer] = useState(null);

    // 모달 상태
    const [showPrayTogether, setShowPrayTogether] = useState(false);
    const [showCheckin, setShowCheckin] = useState(false);
    const [showCheckinResult, setShowCheckinResult] = useState(false);
    const [checkinResponse, setCheckinResponse] = useState(null);

    // 세션 및 체크인 훅
    const { todaysSession, markAsPrayed, requestCheckin, refreshSession } = useSession(loopId, loop);
    const { isCheckinDue, submitCheckin } = useCheckin(loopId, todaysSession?.id);

    // 루프 데이터 로드
    useEffect(() => {
        if (!loopId || !user) return;

        const loadLoop = async () => {
            setLoading(true);
            const { data, error: fetchError } = await getLoop(loopId);
            if (fetchError) {
                setError(fetchError);
            } else {
                setLoop(data);
                // 기존 기도문이 있으면 설정
                if (todaysSession?.prayer_content) {
                    setGeneratedPrayer({
                        title: todaysSession.prayer_title,
                        content: todaysSession.prayer_content,
                    });
                }
            }
            setLoading(false);
        };

        loadLoop();
    }, [loopId, user, getLoop]);

    // 세션에 기도문이 있으면 설정
    useEffect(() => {
        if (todaysSession?.prayer_content && !generatedPrayer) {
            setGeneratedPrayer({
                title: todaysSession.prayer_title,
                content: todaysSession.prayer_content,
            });
        }
    }, [todaysSession, generatedPrayer]);

    // 기도문 생성
    const handleGeneratePrayer = useCallback(async () => {
        if (!loop || !todaysSession) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/generate-prayer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: loop.topic,
                    loopContext: {
                        loopId: loop.id,
                        dayNumber: todaysSession.day_number,
                        emotion: loop.current_emotion,
                        continuePrayer: loop.continue_prayer,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate prayer');
            }

            const data = await response.json();
            setGeneratedPrayer(data);

            // 세션에 기도문 저장
            await markAsPrayed({
                title: data.title,
                content: data.content,
            });

            // 함께 기도하기 모달 표시
            setShowPrayTogether(true);
        } catch (e) {
            console.error('Failed to generate prayer:', e);
            setError('기도문 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsGenerating(false);
        }
    }, [loop, todaysSession, markAsPrayed]);

    // 함께 기도하기 완료
    const handlePrayComplete = useCallback(async () => {
        setShowPrayTogether(false);

        // 체크인 시간이면 체크인 요청
        if (isCheckinDue) {
            // 루프 상태를 checkin_due로 변경
            await transitionTo(loopId, 'checkin_due');
            setShowCheckin(true);
        }
    }, [isCheckinDue, transitionTo, loopId]);

    // 체크인 제출
    const handleCheckinSubmit = useCallback(async (response) => {
        const { data, error: submitError } = await submitCheckin(response);
        if (submitError) {
            console.error('Failed to submit checkin:', submitError);
            return;
        }

        // 루프 상태 업데이트
        await handleCheckinComplete(loopId, response.responseType, response.nextEmotion);

        // 체크인 결과 표시
        setCheckinResponse(response);
        setShowCheckin(false);
        setShowCheckinResult(true);

        // 루프 새로고침
        const { data: updatedLoop } = await getLoop(loopId);
        setLoop(updatedLoop);
        refreshActiveLoop();
    }, [submitCheckin, handleCheckinComplete, loopId, getLoop, refreshActiveLoop]);

    // 체크인 결과 닫기
    const handleCheckinResultClose = useCallback(() => {
        setShowCheckinResult(false);
        setCheckinResponse(null);

        // 완료 또는 보류면 홈으로
        if (['complete', 'snooze'].includes(checkinResponse?.responseType)) {
            navigate('/');
        }
    }, [checkinResponse, navigate]);

    // 수동 체크인 열기
    const handleOpenCheckin = useCallback(() => {
        setShowCheckin(true);
    }, []);

    if (!user) {
        return (
            <div className="loop-detail-page">
                <div className="error-state">
                    <p>로그인이 필요합니다.</p>
                    <button onClick={() => navigate('/')}>홈으로</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loop-detail-page">
                <div className="loading-state">
                    <span className="loading-icon">🙏</span>
                    <p>기도 여정을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error || !loop) {
        return (
            <div className="loop-detail-page">
                <div className="error-state">
                    <span className="error-icon">😢</span>
                    <p>{error || '기도 여정을 찾을 수 없습니다.'}</p>
                    <button onClick={() => navigate('/')}>홈으로</button>
                </div>
            </div>
        );
    }

    return (
        <div className="loop-detail-page">
            <header className="loop-detail-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← 홈
                </button>
                <LoopStatusBadge
                    status={loop.status}
                    dayNumber={todaysSession?.day_number || loop.total_days}
                />
            </header>

            <div className="loop-content">
                <div className="loop-title-section">
                    <h1>{loop.title}</h1>
                    <EmotionBadge emotion={loop.current_emotion} />
                </div>

                <div className="loop-topic">
                    <p>{loop.topic}</p>
                </div>

                <div className="loop-stats">
                    <div className="stat">
                        <span className="stat-value">{loop.total_days || 1}</span>
                        <span className="stat-label">일째</span>
                    </div>
                    {todaysSession?.prayer_count > 0 && (
                        <div className="stat">
                            <span className="stat-value">{todaysSession.prayer_count}</span>
                            <span className="stat-label">오늘 기도</span>
                        </div>
                    )}
                </div>

                {/* 기도문 표시 또는 생성 버튼 */}
                {generatedPrayer ? (
                    <div className="prayer-card">
                        <h3>{generatedPrayer.title}</h3>
                        <div className="prayer-content">
                            {generatedPrayer.content}
                        </div>
                        <button
                            className="pray-again-btn"
                            onClick={() => setShowPrayTogether(true)}
                        >
                            🙏 다시 함께 기도하기
                        </button>
                    </div>
                ) : (
                    <div className="generate-section">
                        <button
                            className="generate-btn"
                            onClick={handleGeneratePrayer}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <span className="generating-icon">🙏</span>
                                    기도문 생성 중...
                                </>
                            ) : (
                                <>
                                    <span className="pray-icon">🕊️</span>
                                    오늘의 기도 시작하기
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* 체크인 버튼 (기도 완료 후 저녁 시간) */}
                {generatedPrayer && (isCheckinDue || loop.status === 'checkin_due') && (
                    <button
                        className="checkin-trigger-btn"
                        onClick={handleOpenCheckin}
                    >
                        💬 오늘 하루는 어땠나요?
                    </button>
                )}
            </div>

            {/* 히스토리 링크 */}
            <div className="loop-footer">
                <button
                    className="history-link"
                    onClick={() => navigate('/loop/history')}
                >
                    📚 기도 여정 기록 보기
                </button>
            </div>

            {/* 모달들 */}
            <PrayTogetherModal
                isOpen={showPrayTogether}
                onClose={() => setShowPrayTogether(false)}
                title={generatedPrayer?.title}
                content={generatedPrayer?.content}
                onComplete={handlePrayComplete}
            />

            <CheckinBottomSheet
                isOpen={showCheckin}
                onClose={() => setShowCheckin(false)}
                loop={loop}
                session={todaysSession}
                onSubmit={handleCheckinSubmit}
            />

            <CheckinResult
                isOpen={showCheckinResult}
                onClose={handleCheckinResultClose}
                responseType={checkinResponse?.responseType}
                nextEmotion={checkinResponse?.nextEmotion}
                loop={loop}
            />
        </div>
    );
}
