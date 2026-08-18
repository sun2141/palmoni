import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { logger } from '../lib/logger';
import './More.css';

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3z" />
    </svg>
);

const DocumentIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
        <path d="M14 3v6h6" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
);

const ShareIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

const SparkleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
);

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

/**
 * 더보기 페이지 - 계정/약관/공유/로그아웃 등 진입점 모음
 */
export default function More() {
    const navigate = useNavigate();
    const { user, signOut, isInitialized } = useAuth();
    const toast = useToast();

    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '게스트';
    const email = user?.email || '';
    const initial = (displayName || '?').trim().charAt(0).toUpperCase();

    const handleShare = async () => {
        const shareData = {
            title: 'Palmoni - 기도 앱',
            text: '누군가 당신과 함께 기도합니다. Palmoni에서 기도해보세요!',
            url: 'https://palmoni.vercel.app',
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    await navigator.clipboard.writeText(shareData.url);
                    toast.success('링크가 복사되었습니다!');
                }
            }
        } else {
            await navigator.clipboard.writeText(shareData.url);
            toast.success('링크가 복사되었습니다!');
        }
    };

    const handleLogout = async () => {
        if (!isInitialized) {
            toast.warning('앱이 초기화 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        try {
            await signOut();
            toast.success('로그아웃되었습니다');
            navigate('/');
        } catch (err) {
            logger.error('Logout error:', err);
            toast.error('로그아웃 중 오류가 발생했습니다');
        }
    };

    return (
        <div className="more-page">
            <header className="more-header">
                <h1 className="more-title">더보기</h1>
                <p className="more-subtitle">계정과 설정을 관리해요</p>
            </header>

            {user ? (
                <div className="more-account" aria-label="계정 정보">
                    <div className="more-avatar" aria-hidden="true">{initial}</div>
                    <div className="more-account-info">
                        <p className="more-account-name">{displayName}</p>
                        {email && <p className="more-account-email">{email}</p>}
                    </div>
                </div>
            ) : (
                <div className="more-section">
                    <ul className="more-list">
                        <li>
                            <Link to="/" className="more-item">
                                <span className="more-item-icon"><UserIcon /></span>
                                <span className="more-item-label">로그인 / 회원가입</span>
                                <span className="more-item-chevron" aria-hidden="true">›</span>
                            </Link>
                        </li>
                    </ul>
                </div>
            )}

            <section className="more-section">
                <h2 className="more-section-title">서비스</h2>
                <ul className="more-list">
                    <li>
                        <Link to="/pricing" className="more-item">
                            <span className="more-item-icon"><SparkleIcon /></span>
                            <span className="more-item-label">프리미엄 요금제</span>
                            <span className="more-item-chevron" aria-hidden="true">›</span>
                        </Link>
                    </li>
                    <li>
                        <button type="button" className="more-item" onClick={handleShare}>
                            <span className="more-item-icon"><ShareIcon /></span>
                            <span className="more-item-label">앱 공유하기</span>
                            <span className="more-item-chevron" aria-hidden="true">›</span>
                        </button>
                    </li>
                </ul>
            </section>

            <section className="more-section">
                <h2 className="more-section-title">약관 및 정책</h2>
                <ul className="more-list">
                    <li>
                        <Link to="/privacy" className="more-item">
                            <span className="more-item-icon"><ShieldIcon /></span>
                            <span className="more-item-label">개인정보처리방침</span>
                            <span className="more-item-chevron" aria-hidden="true">›</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/terms" className="more-item">
                            <span className="more-item-icon"><DocumentIcon /></span>
                            <span className="more-item-label">이용약관</span>
                            <span className="more-item-chevron" aria-hidden="true">›</span>
                        </Link>
                    </li>
                </ul>
            </section>

            {user && (
                <section className="more-section">
                    <h2 className="more-section-title">계정</h2>
                    <ul className="more-list">
                        <li>
                            <button type="button" className="more-item danger" onClick={handleLogout}>
                                <span className="more-item-icon"><LogoutIcon /></span>
                                <span className="more-item-label">로그아웃</span>
                                <span className="more-item-chevron" aria-hidden="true">›</span>
                            </button>
                        </li>
                    </ul>
                </section>
            )}

            <p className="more-footer">Palmoni © 2026</p>
        </div>
    );
}
