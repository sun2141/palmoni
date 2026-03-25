import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoop } from '../../hooks/useLoop';
import { EmotionSelector } from '../../components/loop/EmotionSelector';
import './LoopCreate.css';

/**
 * 기도 여정 생성 페이지 (Screen A)
 */
export default function LoopCreate() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { createLoop, loading, hasActiveLoop, activeLoop } = useLoop();

    // 홈에서 전달받은 topic이 있으면 사용
    const passedTopic = location.state?.topic || '';

    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState(passedTopic);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [emotion, setEmotion] = useState('peace');
    const [continuePrayer, setContinuePrayer] = useState(true);
    const [error, setError] = useState(null);

    // 로그인 체크
    if (!user) {
        return (
            <div className="loop-create-page">
                <div className="login-required">
                    <span className="login-icon">🔐</span>
                    <h2>로그인이 필요해요</h2>
                    <p>매일 기도를 시작하려면 로그인해주세요.</p>
                    <button onClick={() => navigate('/')}>홈으로 가기</button>
                </div>
            </div>
        );
    }

    // 이미 활성 루프가 있는 경우
    if (hasActiveLoop && activeLoop) {
        return (
            <div className="loop-create-page">
                <div className="active-loop-notice">
                    <span className="notice-icon">🙏</span>
                    <h2>진행 중인 매일 기도가 있어요</h2>
                    <p>"{activeLoop.title}" 기도를 이어가시겠어요?</p>
                    <button
                        className="continue-btn"
                        onClick={() => navigate(`/loop/${activeLoop.id}`)}
                    >
                        이어서 기도하기
                    </button>
                    <button
                        className="back-btn"
                        onClick={() => navigate('/')}
                    >
                        홈으로
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('매일 기도 이름을 입력해주세요.');
            return;
        }

        if (!topic.trim()) {
            setError('기도 제목을 입력해주세요.');
            return;
        }

        const { data, error: createError } = await createLoop({
            title: title.trim(),
            topic: topic.trim(),
            emotion,
            continuePrayer,
        });

        if (createError) {
            setError(createError);
            return;
        }

        if (data?.loop?.id) {
            navigate(`/loop/${data.loop.id}`);
        }
    };

    return (
        <div className="loop-create-page">
            <header className="loop-create-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← 뒤로
                </button>
                <h1>새 매일 기도</h1>
            </header>

            {/* 온보딩 카드 */}
            {showOnboarding && (
                <div className="onboarding-card">
                    <button
                        className="onboarding-close"
                        onClick={() => setShowOnboarding(false)}
                    >
                        ×
                    </button>
                    <span className="onboarding-icon">🌱</span>
                    <h2 className="onboarding-title">매일 기도란?</h2>
                    <p className="onboarding-desc">
                        하나의 기도 제목으로 매일 함께 기도해요
                    </p>
                    <ul className="onboarding-features">
                        <li>
                            <span className="feature-icon">📅</span>
                            <span>Day 1, 2, 3... 이어가는 기도</span>
                        </li>
                        <li>
                            <span className="feature-icon">💬</span>
                            <span>저녁에 마음 체크인</span>
                        </li>
                        <li>
                            <span className="feature-icon">✨</span>
                            <span>감정에 맞는 기도문 생성</span>
                        </li>
                    </ul>
                </div>
            )}

            <form className="loop-create-form" onSubmit={handleSubmit}>
                <div className="form-section">
                    <label className="form-label">
                        <span className="label-icon">🏷️</span>
                        이 매일 기도의 이름은?
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="예: 가족을 위한 기도"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={50}
                    />
                </div>

                <div className="form-section">
                    <label className="form-label">
                        <span className="label-icon">🙏</span>
                        무엇을 위해 기도하나요?
                    </label>
                    <textarea
                        className="form-textarea"
                        placeholder="기도하고 싶은 내용을 자유롭게 적어주세요"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        maxLength={200}
                        rows={4}
                    />
                    <span className="char-count">{topic.length}/200</span>
                </div>

                <div className="form-section">
                    <label className="form-label">
                        <span className="label-icon">💫</span>
                        지금 마음은 어떤가요?
                    </label>
                    <EmotionSelector
                        selected={emotion}
                        onChange={setEmotion}
                        variant="horizontal"
                    />
                </div>

                <div className="form-section toggle-section">
                    <div className="toggle-info">
                        <label className="form-label">
                            <span className="label-icon">🔄</span>
                            이어서 기도
                        </label>
                        <p className="toggle-desc">매일 이전 기도에 이어서 기도문이 생성돼요</p>
                    </div>
                    <button
                        type="button"
                        className={`toggle-btn ${continuePrayer ? 'on' : ''}`}
                        onClick={() => setContinuePrayer(!continuePrayer)}
                    >
                        <span className="toggle-thumb" />
                    </button>
                </div>

                {error && <div className="form-error">{error}</div>}

                <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !title.trim() || !topic.trim()}
                >
                    {loading ? '시작하는 중...' : '매일 기도 시작하기'}
                </button>
            </form>

        </div>
    );
}
