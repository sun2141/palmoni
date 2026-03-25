import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoop } from '../../hooks/useLoop';
import { LoopCard } from '../../components/loop/LoopCard';
import './LoopHistory.css';

const FILTER_OPTIONS = [
    { value: 'active', label: '진행 중', statuses: ['active', 'checkin_due', 'continued'] },
    { value: 'completed', label: '완료', statuses: ['completed'] },
    { value: 'all', label: '전체', statuses: null },
];

/**
 * 기도 여정 히스토리 페이지 (Screen G)
 */
export default function LoopHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { fetchHistory } = useLoop();

    const [loops, setLoops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);

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
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← 뒤로
                </button>
                <h1>기도 여정 기록</h1>
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
                        <h3>아직 기도 여정이 없어요</h3>
                        <p>새로운 기도 여정을 시작해보세요!</p>
                        <button onClick={() => navigate('/loop/new')}>
                            기도 여정 시작하기
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="loop-list">
                            {loops.map(loop => (
                                <LoopCard key={loop.id} loop={loop} />
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

            {/* 새 여정 시작 FAB */}
            <button
                className="fab-new-loop"
                onClick={() => navigate('/loop/new')}
            >
                <span>+</span>
            </button>
        </div>
    );
}
