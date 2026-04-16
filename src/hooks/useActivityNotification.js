import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

/**
 * 백그라운드 활동 알림을 가져오는 훅
 * 12초마다 랜덤으로 /api/background-activities를 호출하여
 * 라이브 알림 메시지를 6초간 표시한다
 */
export function useActivityNotification() {
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await fetch('/api/background-activities');
                if (response.ok) {
                    const data = await response.json();
                    setNotification(data.message);
                    setTimeout(() => setNotification(null), 6000);
                }
            } catch (error) {
                logger.error('Error fetching activity:', error);
            }
        };

        const timer = setInterval(() => {
            if (Math.random() > 0.6) {
                fetchActivity();
            }
        }, 12000);

        return () => clearInterval(timer);
    }, []);

    return notification;
}
