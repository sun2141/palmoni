import { useState } from 'react';
import { EmotionSelector, getEmotionInfo } from './EmotionSelector';
import './CheckinBottomSheet.css';

const RESPONSE_OPTIONS = [
    {
        type: 'continue',
        label: '같은 마음으로 계속',
        description: '내일도 이 마음으로 기도할게요',
        icon: '🙏',
    },
    {
        type: 'change_emotion',
        label: '다른 마음으로',
        description: '내일은 다른 감정으로 기도하고 싶어요',
        icon: '🔄',
    },
    {
        type: 'complete',
        label: '기도 마무리',
        description: '이 매일 기도를 마칠게요',
        icon: '✅',
    },
    {
        type: 'snooze',
        label: '잠시 쉬기',
        description: '며칠 후에 다시 시작할게요',
        icon: '⏸️',
    },
];

/**
 * 저녁 체크인 바텀시트
 */
export function CheckinBottomSheet({
    isOpen,
    onClose,
    loop,
    session,
    onSubmit,
}) {
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [nextEmotion, setNextEmotion] = useState(loop?.current_emotion || 'peace');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentEmotionInfo = getEmotionInfo(loop?.current_emotion);

    const handleSubmit = async () => {
        if (!selectedResponse) return;

        setIsSubmitting(true);

        try {
            await onSubmit({
                responseType: selectedResponse,
                nextEmotion: selectedResponse === 'change_emotion' ? nextEmotion : null,
                note: note.trim() || null,
            });
            onClose();
        } catch (e) {
            console.error('Failed to submit checkin:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="checkin-overlay" onClick={handleOverlayClick}>
            <div className="checkin-sheet">
                <div className="checkin-handle" />

                <div className="checkin-header">
                    <span className="checkin-icon">💬</span>
                    <h2>오늘 하루는 어땠나요?</h2>
                    <p>
                        <span className="highlight">{loop?.title}</span> 기도를 이어갈까요?
                    </p>
                </div>

                <div className="checkin-current">
                    <span className="current-label">오늘의 감정</span>
                    <span className="current-emotion">
                        {currentEmotionInfo.icon} {currentEmotionInfo.label}
                    </span>
                    <span className="current-day">Day {session?.day_number || loop?.total_days || 1}</span>
                </div>

                <div className="checkin-options">
                    {RESPONSE_OPTIONS.map((option) => (
                        <button
                            key={option.type}
                            type="button"
                            className={`checkin-option ${selectedResponse === option.type ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedResponse(option.type);
                                if (option.type !== 'change_emotion') {
                                    setNextEmotion(loop?.current_emotion || 'peace');
                                }
                            }}
                        >
                            <span className="option-icon">{option.icon}</span>
                            <div className="option-text">
                                <span className="option-label">{option.label}</span>
                                <span className="option-desc">{option.description}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {selectedResponse === 'change_emotion' && (
                    <div className="checkin-emotion-select">
                        <p className="emotion-prompt">내일은 어떤 마음으로 기도할까요?</p>
                        <EmotionSelector
                            selected={nextEmotion}
                            onChange={setNextEmotion}
                            variant="horizontal"
                            size="small"
                        />
                    </div>
                )}

                <div className="checkin-note">
                    <textarea
                        placeholder="오늘 느낀 점이나 메모를 남겨보세요 (선택)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                    />
                </div>

                <div className="checkin-actions">
                    <button
                        type="button"
                        className="checkin-submit"
                        onClick={handleSubmit}
                        disabled={!selectedResponse || isSubmitting}
                    >
                        {isSubmitting ? '저장 중...' : '저장하기'}
                    </button>
                    <button
                        type="button"
                        className="checkin-cancel"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        나중에
                    </button>
                </div>
            </div>
        </div>
    );
}
