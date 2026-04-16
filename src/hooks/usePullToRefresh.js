import { useState, useRef, useCallback } from 'react';

/**
 * Pull-to-Refresh 동작을 처리하는 훅
 * @param {Function} onRefresh - 새로고침 시 호출될 비동기 함수
 * @returns {{ containerRef, pullDistance, isRefreshing, handlers }}
 */
export function usePullToRefresh(onRefresh) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef(null);
    const touchStartY = useRef(0);
    const isPulling = useRef(false);

    const handleTouchStart = useCallback((e) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling.current) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            setPullDistance(Math.min(diff * 0.5, 80));
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (pullDistance > 60) {
            setIsRefreshing(true);
            Promise.resolve(onRefresh()).finally(() => {
                setIsRefreshing(false);
                setPullDistance(0);
            });
        } else {
            setPullDistance(0);
        }
        isPulling.current = false;
    }, [pullDistance, onRefresh]);

    return {
        containerRef,
        pullDistance,
        isRefreshing,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}
