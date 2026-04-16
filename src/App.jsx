import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { logger } from './lib/logger';

// Lazy load non-critical pages
const MyPrayers = lazy(() => import('./pages/MyPrayers').then(m => ({ default: m.MyPrayers })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));

// Loop pages
const LoopCreate = lazy(() => import('./pages/loop/LoopCreate'));
const LoopDetail = lazy(() => import('./pages/loop/LoopDetail'));
const LoopHistory = lazy(() => import('./pages/loop/LoopHistory'));

// Loading fallback component
function PageLoader() {
    return (
        <div className="page-loader">
            <div className="loader-spinner"></div>
            <p>로딩 중...</p>
        </div>
    );
}

function App() {
    // 서비스 워커 업데이트 감지 및 처리
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // 페이지 로드 시 서비스 워커 업데이트 확인
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    // 업데이트 확인
                    registration.update().catch(err => {
                        logger.warn('SW update check failed:', err);
                    });

                    // 새 서비스 워커가 대기 중이면 활성화
                    if (registration.waiting) {
                        registration.waiting.postMessage('skipWaiting');
                    }

                    // 새 서비스 워커 설치 감지
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // 새 버전 사용 가능 - 자동으로 활성화
                                    newWorker.postMessage('skipWaiting');
                                }
                            });
                        }
                    });
                }
            });

            // 서비스 워커 컨트롤러 변경 시 (새 버전 활성화됨) - 자동 새로고침하지 않음
            // 사용자 경험을 위해 다음 방문 시 새 버전 적용
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    // 자동 새로고침 대신 캐시만 정리
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => {
                                if (name !== 'palmoni-v6') {
                                    caches.delete(name);
                                }
                            });
                        });
                    }
                }
            });
        }

        // 페이지 포커스 시 연결 상태 확인
        const handleFocus = () => {
            // 오프라인 상태에서 온라인으로 돌아왔을 때 처리
            if (navigator.onLine) {
                // 서비스 워커에 캐시 정리 요청
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage('clearCache');
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/my-prayers" element={<MyPrayers />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                {/* Loop routes */}
                <Route path="/loop/new" element={<LoopCreate />} />
                <Route path="/loop/history" element={<LoopHistory />} />
                <Route path="/loop/:loopId" element={<LoopDetail />} />
            </Routes>
        </Suspense>
    );
}

export default App;
