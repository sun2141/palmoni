import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoop } from '../../hooks/useLoop';
import { deleteLoop, updateLoopInfo } from '../../lib/supabaseClient';
import { LoopCard } from '../../components/loop/LoopCard';
import { LoopEditModal } from '../../components/loop/LoopEditModal';
import './LoopHistory.css';

const FILTER_OPTIONS = [
    { value: 'active', label: '진행 중', statuses: ['active', 'checkin_due', 'continued'] },
    { value: 'snoozed', label: '일시중지', statuses: ['snoozed'] },
    { value: 'completed', label: '완료', statuses: ['completed'] },
    { value: 'all', label: '전체', statuses: null },
];

// 상태 우선순위 (낮을수록 위에 표시)
const STATUS_PRIORITY = {
    'active': 1,
    'checkin_due': 1,
    'continued': 1,
    'snoozed': 2,
    'completed': 3,
};

/**
 * 기도 여정 히스토리 페이지 (Screen G)
 */
export default function LoopHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { fetchHistory } = useLoop();

    const [loops, setLoops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [editingLoop, setEditingLoop] = useState(null);

    const LIMIT = 20;

    // 루프 목록 로드
    const loadLoops = useCallback(async (reset = false) => {
        if (!user) return;

        setLoading(true);

        const newOffset = reset ? 0 : offset;
        const filterOption = FILTER_OPTIONS.find(f => f.value === filter);
        const statuses = filterOption?.statuses;

        const { data, error, count } = await fetchHistory({
            limit: LIMIT,
            offset: newOffset,
            status: statuses,
        });

        if (error) {
            console.error('Failed to load history:', error);
            setLoading(false);
            return;
        }

        if (reset) {
            setLoops(data);
            setOffset(LIMIT);
        } else {
            setLoops(prev => [...prev, ...data]);
            setOffset(newOffset + LIMIT);
        }

        setHasMore(data.length === LIMIT);
        setLoading(false);
    }, [user, fetchHistory, filter, offset]);

    // 초기 로드
    useEffect(() => {
        loadLoops(true);
    }, [filter, user]);

    // 더 불러오기
    const handleLoadMore = () => {
        if (!loading && hasMore) {
            loadLoops(false);
        }
    };

    // 필터 변경
    const handleFilterChange = (newFilter) => {
        if (newFilter !== filter) {
            setFilter(newFilter);
            setOffset(0);
        }
    };

    // 정렬된 루프 목록 (전체 보기에서 완료된 것은 아래로)
    const sortedLoops = useMemo(() => {
        if (filter !== 'all') return loops;

        return [...loops].sort((a, b) => {
            const priorityA = STATUS_PRIORITY[a.status] || 99;
            const priorityB = STATUS_PRIORITY[b.status] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // 같은 우선순위면 최신순
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [loops, filter]);

    // 루프 삭제
    const handleDelete = async (loopId) => {
        const loop = loops.find(l => l.id === loopId);
        const isActive = loop && ['active', 'checkin_due', 'continued'].includes(loop.status);
        const message = isActive
            ? '진행 중인 매일 기도를 삭제하시겠습니까?\n기도 기록이 모두 사라집니다.'
            : '이 매일 기도를 삭제하시겠습니까?\n관련된 모든 기록이 삭제됩니다.';

        if (!confirm(message)) return;

        const { error } = await deleteLoop(loopId);
        if (error) {
            alert('삭제에 실패했습니다: ' + error);
            return;
        }

        // 목록에서 제거
        setLoops(prev => prev.filter(l => l.id !== loopId));
    };

    // 편집 모달 열기
    const handleEdit = (loop) => {
        setEditingLoop(loop);
    };

    // 편집 저장
    const handleEditSave = async ({ title, topic, emotion }) => {
        if (!editingLoop) return;
        const { data, error } = await updateLoopInfo(editingLoop.id, { title, topic, emotion });
        if (error) {
            alert('수정에 실패했습니다: ' + error);
            return;
        }
        setLoops(prev => prev.map(l => l.id === editingLoop.id ? { ...l, ...data } : l));
        setEditingLoop(null);
    };

    if (!user) {
        return (
            <div className="loop-history-page">
                <div className="login-required">
                    <p>로그인이 필요합니다.</p>
                    <button onClick={() => navigate('/')}>홈으로</button>
                </div>
            </div>
        );
    }

    return (
        <div className="loop-history-page">
            <header className="history-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← 홈
                </button>
                <h1>매일 기도</h1>
                <button className="new-loop-btn" onClick={() => navigate('/loop/new')}>
                    + 새 기도
                </button>
            </header>

            <div className="filter-tabs">
                {FILTER_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        className={`filter-tab ${filter === option.value ? 'active' : ''}`}
                        onClick={() => handleFilterChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="history-content">
                {loops.length === 0 && !loading ? (
                    <div className="empty-state">
                        <span className="empty-icon">📚</span>
                        <h3>아직 매일 기도가 없어요</h3>
                        <p>새로운 매일 기도를 시작해보세요!</p>
                        <button onClick={() => navigate('/loop/new')}>
                            매일 기도 시작하기
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="loop-list">
                            {sortedLoops.map(loop => (
                                <LoopCard
                                    key={loop.id}
                                    loop={loop}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    showDelete={true}
                                    showEdit={!['completed'].includes(loop.status)}
                                />
                            ))}
                        </div>

                        {loading && (
                            <div className="loading-more">
                                <span>불러오는 중...</span>
                            </div>
                        )}

                        {!loading && hasMore && (
                            <button
                                className="load-more-btn"
                                onClick={handleLoadMore}
                            >
                                더 보기
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* 편집 모달 */}
            {editingLoop && (
                <LoopEditModal
                    loop={editingLoop}
                    onSave={handleEditSave}
                    onClose={() => setEditingLoop(null)}
                />
            )}
        </div>
    );
}
