import { getEmotionInfo } from './EmotionSelector';
import './CheckinResult.css';

const RESULT_MESSAGES = {
    continue: {
        title: '내일도 함께해요',
        message: '같은 마음을 붙들고 내일도 이어서 기도할게요.',
        icon: '🙏',
    },
    change_emotion: {
        title: '새로운 마음으로',
        message: '내일은 다른 감정으로 기도를 이어갈게요.',
        icon: '🔄',
    },
    complete: {
        title: '기도 여정 완료',
        message: '이 기도 여정을 마무리했어요. 기록으로 남겨둘게요.',
        icon: '✅',
    },
    snooze: {
        title: '잠시 쉬어가요',
        message: '준비가 되면 언제든 다시 시작할 수 있어요.',
        icon: '⏸️',
    },
};

/**
 * 체크인 결과 표시 컴포넌트
 */
export function CheckinResult({
    isOpen,
    onClose,
    responseType,
    nextEmotion,
    loop,
}) {
    if (!isOpen) return null;

    const result = RESULT_MESSAGES[responseType] || RESULT_MESSAGES.continue;
    const nextEmotionInfo = nextEmotion ? getEmotionInfo(nextEmotion) : null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="checkin-result-overlay" onClick={handleOverlayClick}>
            <div className="checkin-result-modal">
                <div className="result-icon">{result.icon}</div>

                <h2 className="result-title">{result.title}</h2>

                <p className="result-message">{result.message}</p>

                {responseType === 'change_emotion' && nextEmotionInfo && (
                    <div className="result-next-emotion">
                        <span className="next-label">내일의 감정</span>
                        <span className="next-emotion">
                            {nextEmotionInfo.icon} {nextEmotionInfo.label}
                        </span>
                    </div>
                )}

                {responseType === 'complete' && (
                    <div className="result-stats">
                        <div className="stat-item">
                            <span className="stat-value">{loop?.total_days || 1}</span>
                            <span className="stat-label">일간 기도</span>
                        </div>
                    </div>
                )}

                {['continue', 'change_emotion'].includes(responseType) && (
                    <div className="result-next-info">
                        <span className="next-prayer-label">다음 기도</span>
                        <span className="next-prayer-time">내일 아침에 알려드릴게요</span>
                    </div>
                )}

                <button className="result-close-btn" onClick={onClose}>
                    확인
                </button>
            </div>
        </div>
    );
}
