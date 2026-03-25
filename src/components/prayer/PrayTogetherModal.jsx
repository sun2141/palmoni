import { useState, useEffect } from 'react';
import './PrayTogetherModal.css';

/**
 * 함께 기도하기 모달
 *
 * 기도문 생성 완료 후 표시되며, 사용자가 기도문을 읽으며 함께 기도할 수 있도록 안내합니다.
 */
export function PrayTogetherModal({ isOpen, onClose, title, content, onComplete }) {
    const [isPraying, setIsPraying] = useState(false);
    const [progress, setProgress] = useState(0);

    // 모달이 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setIsPraying(false);
            setProgress(0);
        }
    }, [isOpen]);

    // 기도 진행 중 프로그레스 바 애니메이션
    useEffect(() => {
        if (!isPraying) return;

        const duration = 15000; // 15초
        const interval = 100;
        const increment = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    // 기도 완료
                    setTimeout(() => {
                        onComplete?.();
                    }, 500);
                    return 100;
                }
                return prev + increment;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isPraying, onComplete]);

    const handleStartPraying = () => {
        setIsPraying(true);
    };

    const handleSkip = () => {
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div className="pray-together-overlay" onClick={handleSkip}>
            <div className="pray-together-modal" onClick={e => e.stopPropagation()}>
                {!isPraying ? (
                    // 기도 시작 전 화면
                    <>
                        <div className="pray-together-header">
                            <span className="pray-icon">🕊️</span>
                            <h2>누군가 당신을 위해 기도했어요</h2>
                            <p>함께 기도하시겠어요?</p>
                        </div>

                        <div className="pray-together-preview">
                            <h3>{title}</h3>
                            <p className="preview-content">{content?.substring(0, 100)}...</p>
                        </div>

                        <div className="pray-together-actions">
                            <button className="pray-btn primary" onClick={handleStartPraying}>
                                🙏 함께 기도하기
                            </button>
                            <button className="pray-btn secondary" onClick={handleSkip}>
                                나중에 할게요
                            </button>
                        </div>
                    </>
                ) : (
                    // 기도 진행 중 화면
                    <>
                        <div className="pray-together-header praying">
                            <span className="pray-icon animated">🙏</span>
                            <h2>함께 기도하는 중...</h2>
                        </div>

                        <div className="pray-together-content">
                            <h3>{title}</h3>
                            <div className="prayer-text">
                                {content}
                            </div>
                        </div>

                        <div className="pray-progress">
                            <div
                                className="pray-progress-bar"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <p className="pray-hint">
                            기도문을 천천히 읽어보세요
                        </p>

                        <button className="pray-btn skip" onClick={handleSkip}>
                            완료
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
