import { NavLink } from 'react-router-dom';
import './TabBar.css';

// Outlined 아이콘 (비활성 상태)
const HomeIconOutlined = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-4v-6h-4v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
);

const HomeIconFilled = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-4v-6h-4v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
);

const BookIconOutlined = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5V4.5z" />
        <path d="M5 4.5V20.5A1.5 1.5 0 0 0 6.5 22H19v-3" />
    </svg>
);

const BookIconFilled = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M6.5 3A1.5 1.5 0 0 0 5 4.5v16A1.5 1.5 0 0 1 6.5 19H19V3H6.5z" />
        <path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3H6.5A1.5 1.5 0 0 0 5 20.5z" fill="currentColor" />
    </svg>
);

const MoreIconOutlined = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
);

const MoreIconFilled = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="3" y="5" width="18" height="3" rx="1.5" />
        <rect x="3" y="10.5" width="18" height="3" rx="1.5" />
        <rect x="3" y="16" width="18" height="3" rx="1.5" />
    </svg>
);

const TABS = [
    { to: '/', label: '홈', filled: HomeIconFilled, outlined: HomeIconOutlined, end: true },
    { to: '/my-prayers', label: '내 기도', filled: BookIconFilled, outlined: BookIconOutlined, end: false },
    { to: '/more', label: '더보기', filled: MoreIconFilled, outlined: MoreIconOutlined, end: false },
];

/**
 * 전역 하단 탭 바
 * - react-router-dom NavLink 기반 자동 활성 상태
 * - 활성 시 filled 아이콘 + 골드 색상, 비활성 시 outlined + 뮤트 색상
 * - safe-area-inset-bottom 대응
 */
export function TabBar() {
    return (
        <nav className="tab-bar" aria-label="주요 탐색">
            {TABS.map(({ to, label, filled: Filled, outlined: Outlined, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `tab-bar-item${isActive ? ' is-active' : ''}`}
                    aria-label={label}
                >
                    {({ isActive }) => (
                        <>
                            <span className="tab-bar-icon" aria-hidden="true">
                                {isActive ? <Filled /> : <Outlined />}
                            </span>
                            <span className="tab-bar-label">{label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default TabBar;
