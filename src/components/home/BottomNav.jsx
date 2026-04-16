import { useNavigate } from 'react-router-dom';

/**
 * 홈 화면 하단 네비게이션 (로그인 사용자 전용)
 */
export function BottomNav({ onLogout, onShare }) {
    const navigate = useNavigate();

    return (
        <nav className="bottom-nav" aria-label="주요 메뉴">
            <button
                className="bottom-nav-btn"
                aria-label="내 기도문 보기"
                onClick={() => navigate('/my-prayers')}
            >
                <span className="nav-icon">📖</span>
                <span className="nav-text">내 기도문</span>
            </button>
            <button
                className="bottom-nav-btn loop-journey"
                aria-label="매일 기도 목록 보기"
                onClick={() => navigate('/loop/history')}
            >
                <span className="nav-icon">🌱</span>
                <span className="nav-text">매일 기도</span>
            </button>
            <button
                className="bottom-nav-btn logout"
                aria-label="로그아웃"
                onClick={onLogout}
            >
                <span className="nav-icon">🚪</span>
                <span className="nav-text">로그아웃</span>
            </button>
            <button
                className="bottom-nav-btn share icon-only"
                aria-label="앱 공유하기"
                onClick={onShare}
            >
                <span className="nav-icon">📤</span>
            </button>
        </nav>
    );
}
