import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/common/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// 전역 에러 핸들러 (디버그용)
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', message, source, lineno, colno, error);
    return false;
};
window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
};

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 앱 시작 시 오래된 캐시 정리
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name !== 'palmoni-v6')
            .map(name => caches.delete(name))
        );
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);

      // 새 서비스 워커가 대기 중이면 즉시 활성화
      if (registration.waiting) {
        registration.waiting.postMessage('skipWaiting');
      }
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  });
}

// 로딩 화면 숨기기
const hideAppLoading = () => {
  const appLoading = document.getElementById('app-loading');
  if (appLoading) {
    appLoading.style.display = 'none';
  }
};

// 앱 로드 완료 후 로딩 화면 제거
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
);

// React 앱이 마운트되면 로딩 화면 숨김
hideAppLoading();
