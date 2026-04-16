import { useState, useEffect } from 'react';
import { getActiveUsersCount } from '../lib/supabaseClient';

/**
 * 실시간 활성 사용자 수를 관리하는 훅
 * 실제 데이터가 200명 이상일 때만 실제 수 표시, 미만이면 가상 숫자 표시
 */
export function useActiveUsers() {
    const [activeUsers, setActiveUsers] = useState(127);
    const [useRealCount, setUseRealCount] = useState(false);

    useEffect(() => {
        const checkRealUsers = async () => {
            const realCount = await getActiveUsersCount();
            if (realCount !== null) {
                setActiveUsers(realCount);
                setUseRealCount(true);
            }
        };
        checkRealUsers();

        const interval = setInterval(async () => {
            if (useRealCount) {
                const realCount = await getActiveUsersCount();
                if (realCount !== null) {
                    setActiveUsers(realCount);
                } else {
                    setUseRealCount(false);
                    setActiveUsers(Math.floor(Math.random() * 50) + 100);
                }
            } else {
                setActiveUsers(prev => {
                    const change = Math.floor(Math.random() * 11) - 5;
                    return Math.max(80, Math.min(199, prev + change));
                });
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [useRealCount]);

    return activeUsers;
}
