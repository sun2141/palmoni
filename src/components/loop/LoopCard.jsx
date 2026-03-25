import { useNavigate } from 'react-router-dom';
import { LoopStatusBadge } from './LoopStatusBadge';
import { EmotionBadge } from './EmotionSelector';
import './LoopCard.css';

/**
 * 기도 여정 카드 (히스토리 목록용)
 */
export function LoopCard({ loop, onClick }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) {
            onClick(loop);
        } else {
            navigate(`/loop/${loop.id}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getDurationText = () => {
        const days = loop.total_days || 1;
        if (loop.status === 'completed') {
            return `${days}일간 기도`;
        }
        return `${days}일째`;
    };

    return (
        <div className="loop-card" onClick={handleClick}>
            <div className="loop-card-header">
                <h3 className="loop-title">{loop.title}</h3>
                <LoopStatusBadge status={loop.status} size="small" />
            </div>

            <p className="loop-topic">{loop.topic}</p>

            <div className="loop-card-footer">
                <div className="loop-meta">
                    <EmotionBadge emotion={loop.current_emotion} showLabel={false} />
                    <span className="loop-duration">{getDurationText()}</span>
                    <span className="loop-date">
                        {formatDate(loop.started_at)}
                        {loop.completed_at && ` - ${formatDate(loop.completed_at)}`}
                    </span>
                </div>

                {['active', 'checkin_due', 'continued'].includes(loop.status) && (
                    <button className="loop-continue-btn">이어가기</button>
                )}
            </div>
        </div>
    );
}
