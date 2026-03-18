import { useState, useEffect, useCallback } from 'react';

/**
 * Web Notification API 훅
 * 브라우저 알림을 관리합니다.
 */
export function useNotification() {
    const [permission, setPermission] = useState('default');
    const [isSupported, setIsSupported] = useState(false);

    // 브라우저 지원 및 권한 상태 확인
    useEffect(() => {
        const supported = 'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission);
        }
    }, []);

    // 알림 권한 요청
    const requestPermission = useCallback(async () => {
        if (!isSupported) {
            return 'unsupported';
        }

        if (permission === 'granted') {
            return 'granted';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (error) {
            console.error('Notification permission error:', error);
            return 'error';
        }
    }, [isSupported, permission]);

    // 알림 보내기
    const sendNotification = useCallback((title, options = {}) => {
        if (!isSupported || permission !== 'granted') {
            return null;
        }

        const defaultOptions = {
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32.png',
            tag: 'palmoni-prayer',
            renotify: true,
            requireInteraction: false,
            silent: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            // 클릭 시 앱으로 포커스
            notification.onclick = () => {
                window.focus();
                notification.close();
                if (options.onClick) {
                    options.onClick();
                }
            };

            // 자동 닫기 (5초 후)
            setTimeout(() => {
                notification.close();
            }, 5000);

            return notification;
        } catch (error) {
            console.error('Failed to send notification:', error);
            return null;
        }
    }, [isSupported, permission]);

    // 기도 시간 알림 보내기
    const sendPrayerNotification = useCallback((prayerTopic) => {
        return sendNotification('🙏 팔모니가 기도 중입니다', {
            body: `"${prayerTopic}" - 지금 팔모니가 당신을 위해 기도하고 있습니다.`,
            tag: 'palmoni-prayer-active',
            vibrate: [200, 100, 200],
        });
    }, [sendNotification]);

    // 기도 완료 알림 보내기
    const sendCompletionNotification = useCallback((prayerTopic, totalPrayers) => {
        return sendNotification('✨ 오늘의 기도가 완료되었습니다', {
            body: `"${prayerTopic}" - 팔모니가 ${totalPrayers}번의 기도를 마쳤습니다.`,
            tag: 'palmoni-prayer-complete',
        });
    }, [sendNotification]);

    // 다음 기도 예고 알림 (선택사항)
    const sendUpcomingNotification = useCallback((prayerTopic, minutesUntil) => {
        return sendNotification('📿 곧 기도 시간입니다', {
            body: `"${prayerTopic}" - ${minutesUntil}분 후 팔모니가 기도합니다.`,
            tag: 'palmoni-prayer-upcoming',
        });
    }, [sendNotification]);

    return {
        isSupported,
        permission,
        requestPermission,
        sendNotification,
        sendPrayerNotification,
        sendCompletionNotification,
        sendUpcomingNotification,
        canNotify: isSupported && permission === 'granted',
    };
}
