import './EmotionSelector.css';

const EMOTIONS = [
    { value: 'peace', label: '평화', icon: '🕊️', color: '#93c5fd' },
    { value: 'gratitude', label: '감사', icon: '🙏', color: '#fbbf24' },
    { value: 'repentance', label: '회개', icon: '💧', color: '#a78bfa' },
    { value: 'hope', label: '소망', icon: '🌟', color: '#86efac' },
    { value: 'sadness', label: '위로', icon: '💙', color: '#60a5fa' },
];

/**
 * 감정 선택 컴포넌트
 */
export function EmotionSelector({
    selected,
    onChange,
    disabled = false,
    variant = 'horizontal',
    showLabels = true,
    size = 'medium',
}) {
    return (
        <div className={`emotion-selector ${variant} ${size}`}>
            {EMOTIONS.map((emotion) => (
                <button
                    key={emotion.value}
                    type="button"
                    className={`emotion-btn ${selected === emotion.value ? 'selected' : ''}`}
                    onClick={() => onChange?.(emotion.value)}
                    disabled={disabled}
                    style={{
                        '--emotion-color': emotion.color,
                    }}
                >
                    <span className="emotion-icon">{emotion.icon}</span>
                    {showLabels && <span className="emotion-label">{emotion.label}</span>}
                </button>
            ))}
        </div>
    );
}

/**
 * 감정 정보 가져오기 헬퍼
 */
export function getEmotionInfo(value) {
    return EMOTIONS.find((e) => e.value === value) || EMOTIONS[0];
}

/**
 * 감정 배지 컴포넌트 (작은 표시용)
 */
export function EmotionBadge({ emotion, showLabel = true }) {
    const info = getEmotionInfo(emotion);

    return (
        <span
            className="emotion-badge"
            style={{ '--emotion-color': info.color }}
        >
            <span className="badge-icon">{info.icon}</span>
            {showLabel && <span className="badge-label">{info.label}</span>}
        </span>
    );
}

export { EMOTIONS };
