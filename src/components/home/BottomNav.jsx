import { useNavigate } from 'react-router-dom';

// Thin line SVG icons
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </svg>
);

const SeedlingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12C12 12 7 11 5 7c-1-2-1-5 3-5 3 0 4 2.5 4 5" />
    <path d="M12 12C12 12 17 11 19 7c1-2 1-5-3-5-3 0-4 2.5-4 5" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

/**
 * 홈 화면 하단 네비게이션 (로그인 사용자 전용)
 * - SVG 라인 아이콘 사용 (더 얇고 우아한 스타일)
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
                <span className="nav-icon"><BookIcon /></span>
                <span className="nav-text">기도문</span>
            </button>
            <button
                className="bottom-nav-btn loop-journey"
                aria-label="매일 기도 목록 보기"
                onClick={() => navigate('/loop/history')}
            >
                <span className="nav-icon"><SeedlingIcon /></span>
                <span className="nav-text">매일 기도</span>
            </button>
            <button
                className="bottom-nav-btn logout"
                aria-label="로그아웃"
                onClick={onLogout}
            >
                <span className="nav-icon"><LogoutIcon /></span>
                <span className="nav-text">로그아웃</span>
            </button>
            <button
                className="bottom-nav-btn share icon-only"
                aria-label="앱 공유하기"
                onClick={onShare}
            >
                <span className="nav-icon"><ShareIcon /></span>
            </button>
        </nav>
    );
}
