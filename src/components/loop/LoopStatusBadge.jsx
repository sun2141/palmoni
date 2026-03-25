import './LoopStatusBadge.css';

const STATUS_CONFIG = {
    active: {
        label: '기도 중',
        icon: '🙏',
        color: '#22c55e',
        pulse: true,
    },
    checkin_due: {
        label: '체크인 필요',
        icon: '💬',
        color: '#f97316',
        pulse: true,
    },
    continued: {
        label: '내일 계속',
        icon: '🌙',
        color: '#6366f1',
        pulse: false,
    },
    completed: {
        label: '완료됨',
        icon: '✅',
        color: '#6b7280',
        pulse: false,
    },
    snoozed: {
        label: '일시중지',
        icon: '⏸️',
        color: '#eab308',
        pulse: false,
    },
};

/**
 * 루프 상태 배지
 */
export function LoopStatusBadge({ status, dayNumber = null, size = 'medium' }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;

    return (
        <span
            className={`loop-status-badge ${size} ${config.pulse ? 'pulse' : ''}`}
            style={{ '--status-color': config.color }}
        >
            <span className="status-icon">{config.icon}</span>
            <span className="status-label">
                {dayNumber && status === 'active' ? `Day ${dayNumber}` : config.label}
            </span>
        </span>
    );
}
