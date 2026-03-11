import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';

// Lazy load non-critical pages
const MyPrayers = lazy(() => import('./pages/MyPrayers').then(m => ({ default: m.MyPrayers })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));

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
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/my-prayers" element={<MyPrayers />} />
                <Route path="/pricing" element={<Pricing />} />
            </Routes>
        </Suspense>
    );
}

export default App;
