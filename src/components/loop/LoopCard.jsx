import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoopStatusBadge } from './LoopStatusBadge';
import { EmotionBadge } from './EmotionSelector';
import { useLoop } from '../../hooks/useLoop';
import './LoopCard.css';

/**
 * 기도 여정 카드 (히스토리 목록용)
 */
export function LoopCard({ loop, onClick, onResume, onDelete, onEdit, showDelete = false, showEdit = false }) {
    const navigate = useNavigate();
    const { resumeLoop, canCreateLoop } = useLoop();
    const [resuming, setResuming] = useState(false);

    const handleClick = () => {
        // snoozed나 completed 상태면 클릭 무시
        if (['snoozed', 'completed'].includes(loop.status)) return;

        if (onClick) {
            onClick(loop);
        } else {
            navigate(`/loop/${loop.id}`);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(loop.id);
        }
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(loop);
        }
    };

    const handleResume = async (e) => {
        e.stopPropagation(); // 카드 클릭 이벤트 방지

        if (!canCreateLoop) {
            alert('최대 3개의 매일 기도만 진행할 수 있습니다.');
            return;
        }

        setResuming(true);
        const { data, error } = await resumeLoop(loop.id);
        setResuming(false);

        if (error) {
            alert(error);
            return;
        }

        if (onResume) {
            onResume(loop);
        }

        // 다시 시작된 루프로 이동
        navigate(`/loop/${loop.id}`);
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

                {loop.status === 'snoozed' && (
                    <button
                        className="loop-resume-btn"
                        onClick={handleResume}
                        disabled={resuming}
                    >
                        {resuming ? '시작 중...' : '▶️ 다시 시작'}
                    </button>
                )}

                {showEdit && (
                    <button
                        className="loop-edit-btn"
                        onClick={handleEdit}
                        title="수정"
                    >
                        ✏️
                    </button>
                )}

                {showDelete && (
                    <button
                        className="loop-delete-btn"
                        onClick={handleDelete}
                        title="삭제"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}
