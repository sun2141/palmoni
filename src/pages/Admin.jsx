import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';
import './Admin.css';

// ─── Admin API helper ───────────────────────────────────────────────────────

async function adminFetch(path, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증 토큰이 없습니다');

  const url = new URL(`/api/admin/${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API 요청 실패');
  }
  return res.json();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon, color = '#6C47FF' }) {
  return (
    <div className="admin-stat-card" style={{ '--card-accent': color }}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        <p className="admin-stat-title">{title}</p>
        <p className="admin-stat-value">{value}</p>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

function Pagination({ page, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button
        className="admin-btn-sm"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        ← 이전
      </button>
      <span className="admin-page-info">
        {page} / {totalPages} 페이지 (총 {total}건)
      </span>
      <button
        className="admin-btn-sm"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        다음 →
      </button>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="admin-search-bar">
      <span className="admin-search-icon">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-search-input"
      />
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminFetch('stats')
      .then(data => setStats(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">통계 불러오는 중...</div>;
  if (error) return <div className="admin-error">오류: {error}</div>;

  const formatKRW = (n) => `₩${(n || 0).toLocaleString('ko-KR')}`;

  return (
    <div className="admin-dashboard">
      <h2 className="admin-section-title">대시보드</h2>
      <div className="admin-stat-grid">
        <StatCard
          title="총 사용자"
          value={(stats.totalUsers || 0).toLocaleString()}
          sub={`이번 주 +${stats.newUsersThisWeek || 0}명`}
          icon="👥"
          color="#6C47FF"
        />
        <StatCard
          title="오늘 기도 수"
          value={(stats.todayPrayers || 0).toLocaleString()}
          sub={`전체 ${(stats.totalPrayers || 0).toLocaleString()}개`}
          icon="🙏"
          color="#4A90E2"
        />
        <StatCard
          title="후원 합계"
          value={formatKRW(stats.totalDonations)}
          sub={`총 ${stats.donationCount || 0}건`}
          icon="💝"
          color="#00C2CB"
        />
      </div>

      {stats.monthlyDonations && Object.keys(stats.monthlyDonations).length > 0 && (
        <div className="admin-card">
          <h3 className="admin-card-title">월별 후원 현황</h3>
          <div className="admin-monthly-table">
            {Object.entries(stats.monthlyDonations)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 6)
              .map(([month, amount]) => (
                <div key={month} className="admin-monthly-row">
                  <span className="admin-monthly-month">{month}</span>
                  <div className="admin-monthly-bar-wrap">
                    <div
                      className="admin-monthly-bar"
                      style={{
                        width: `${Math.min(100, (amount / Math.max(...Object.values(stats.monthlyDonations))) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="admin-monthly-amount">{formatKRW(amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((p, s) => {
    setLoading(true);
    adminFetch('users', { page: p, limit: 20, search: s })
      .then(data => {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(page, search), 300);
    return () => clearTimeout(timer);
  }, [page, search, load]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h2 className="admin-section-title">사용자 목록</h2>
        <SearchBar value={search} onChange={handleSearch} placeholder="이름, 이메일 검색..." />
      </div>

      {error && <div className="admin-error">오류: {error}</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>플랜</th>
                <th>기도 수</th>
                <th>가입일</th>
                <th>관리자</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-table-empty">불러오는 중...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">사용자가 없습니다</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="admin-cell-name">{u.full_name || '-'}</td>
                  <td className="admin-cell-email">{u.email || '-'}</td>
                  <td>
                    <span className={`admin-badge ${u.plan === 'pro' ? 'admin-badge-pro' : 'admin-badge-free'}`}>
                      {u.plan || 'free'}
                    </span>
                  </td>
                  <td className="admin-cell-number">{u.prayerCount || 0}</td>
                  <td className="admin-cell-date">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td>
                    {u.is_admin && <span className="admin-badge admin-badge-admin">관리자</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>
    </div>
  );
}

// ─── Prayers Tab ──────────────────────────────────────────────────────────────

const EMOTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'peace', label: '평안 🕊️' },
  { value: 'gratitude', label: '감사 🙏' },
  { value: 'sadness', label: '위로 💙' },
  { value: 'hope', label: '희망 🌟' },
];

function PrayersTab() {
  const [prayers, setPrayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [emotion, setEmotion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback((p, s, e) => {
    setLoading(true);
    adminFetch('prayers', { page: p, limit: 20, search: s, emotion: e })
      .then(data => {
        setPrayers(data.prayers || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(page, search, emotion), 300);
    return () => clearTimeout(timer);
  }, [page, search, emotion, load]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleEmotion = (val) => { setEmotion(val); setPage(1); };

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h2 className="admin-section-title">기도 요청 목록</h2>
        <div className="admin-filters">
          <SearchBar value={search} onChange={handleSearch} placeholder="제목, 내용 검색..." />
          <select
            className="admin-select"
            value={emotion}
            onChange={e => handleEmotion(e.target.value)}
          >
            {EMOTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="admin-error">오류: {error}</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>내용 미리보기</th>
                <th>감정</th>
                <th>사용자</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="admin-table-empty">불러오는 중...</td></tr>
              ) : prayers.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">기도 요청이 없습니다</td></tr>
              ) : prayers.map(p => (
                <React.Fragment key={p.id}>
                  <tr
                    className="admin-row-clickable"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <td className="admin-cell-title">{p.title || '-'}</td>
                    <td className="admin-cell-preview">{p.contentPreview || '-'}</td>
                    <td>
                      {p.emotion && (
                        <span className="admin-badge admin-badge-emotion">{p.emotion}</span>
                      )}
                    </td>
                    <td className="admin-cell-email">{p.user?.email || '-'}</td>
                    <td className="admin-cell-date">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="admin-row-expanded">
                      <td colSpan={5}>
                        <div className="admin-prayer-full">
                          <strong>전체 내용</strong>
                          <p>{p.content}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>
    </div>
  );
}

// ─── Donations Tab ────────────────────────────────────────────────────────────

function DonationsTab() {
  const [donations, setDonations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((p) => {
    setLoading(true);
    adminFetch('donations', { page: p, limit: 20 })
      .then(data => {
        setDonations(data.donations || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const formatKRW = (n) => `₩${(n || 0).toLocaleString('ko-KR')}`;

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h2 className="admin-section-title">후원 내역</h2>
      </div>

      {error && <div className="admin-error">오류: {error}</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>사용자</th>
                <th>금액</th>
                <th>Stripe 상태</th>
                <th>Payment Intent</th>
                <th>날짜</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="admin-table-empty">불러오는 중...</td></tr>
              ) : donations.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">후원 내역이 없습니다</td></tr>
              ) : donations.map(d => (
                <tr key={d.id}>
                  <td className="admin-cell-email">{d.user?.email || '비회원'}</td>
                  <td className="admin-cell-amount">{formatKRW(d.amount)}</td>
                  <td>
                    <span className={`admin-badge ${d.stripeStatus === 'succeeded' ? 'admin-badge-success' : 'admin-badge-unknown'}`}>
                      {d.stripeStatus}
                    </span>
                  </td>
                  <td className="admin-cell-intent">
                    {d.stripe_payment_intent ? (
                      <span className="admin-cell-mono">{d.stripe_payment_intent.slice(0, 20)}...</span>
                    ) : '-'}
                  </td>
                  <td className="admin-cell-date">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: '📊' },
  { id: 'users', label: '사용자', icon: '👥' },
  { id: 'prayers', label: '기도 요청', icon: '🙏' },
  { id: 'donations', label: '후원 내역', icon: '💝' },
];

export function Admin() {
  const { user, profile, loading: authLoading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin access check
  useEffect(() => {
    // 인증 초기화가 완료되지 않았으면 대기
    if (!isInitialized) return;

    // 로그인되지 않은 경우 홈으로 이동
    if (!user) {
      navigate('/');
      return;
    }

    // profile이 undefined이면 아직 로드 중 - 대기
    if (profile === undefined) return;

    // profile 로드 완료 후 is_admin 확인
    if (profile?.is_admin !== true) {
      logger.warn('[Admin] Access denied for user:', user.email, '| is_admin:', profile?.is_admin);
      navigate('/');
    }
  }, [user, profile, isInitialized, navigate]);

  // Close sidebar when tab changes on mobile
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // 인증 초기화 전 또는 프로필 로드 전: 로딩 스피너
  if (!isInitialized || (user && profile === undefined)) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-spinner" />
        <p>접근 확인 중...</p>
      </div>
    );
  }

  // 로그인 안됨 또는 admin 아님: navigate가 처리하지만, 렌더링 전에 null 반환
  if (!user || profile?.is_admin !== true) return null;

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`}>
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-logo">🕊️</span>
          <span className="admin-sidebar-brand">Palmoni Admin</span>
          <button
            className="admin-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'admin-nav-item-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="admin-nav-item admin-nav-back"
            onClick={() => navigate('/')}
          >
            <span className="admin-nav-icon">←</span>
            <span>앱으로 돌아가기</span>
          </button>
          <p className="admin-sidebar-user">{user?.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        {/* Top bar (mobile) */}
        <header className="admin-topbar">
          <button
            className="admin-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            <span /><span /><span />
          </button>
          <span className="admin-topbar-title">
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
          <button
            className="admin-topbar-back"
            onClick={() => navigate('/')}
          >
            앱으로
          </button>
        </header>

        {/* Tab content */}
        <main className="admin-content">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'prayers' && <PrayersTab />}
          {activeTab === 'donations' && <DonationsTab />}
        </main>
      </div>
    </div>
  );
}

export default Admin;
