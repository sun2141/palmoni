import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFCMToken, onForegroundMessage } from '../lib/firebase';
import { supabase } from '../lib/supabaseClient';

/**
 * FCM 푸시 구독 관리 훅
 * 백그라운드 푸시 알림을 위한 토큰 관리
 */
export function usePushSubscription() {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 구독 상태 확인
    useEffect(() => {
        if (!user) {
            setIsSubscribed(false);
            return;
        }

        const checkSubscription = async () => {
            try {
                const { data } = await supabase
                    .from('push_subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .single();

                setIsSubscribed(!!data);
            } catch (e) {
                // 구독 없음
                setIsSubscribed(false);
            }
        };

        checkSubscription();
    }, [user]);

    // 포그라운드 메시지 리스너 설정
    useEffect(() => {
        const unsubscribe = onForegroundMessage((payload) => {
            // 앱이 열려있을 때는 토스트로 알림 표시
            if (payload.notification) {
                // 브라우저 알림 표시 (앱이 포커스 상태가 아닐 때)
                if (document.visibilityState !== 'visible') {
                    new Notification(payload.notification.title, {
                        body: payload.notification.body,
                        icon: '/apple-touch-icon.png'
                    });
                }
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    // 푸시 알림 구독
    const subscribe = useCallback(async () => {
        if (!user) {
            setError('로그인이 필요합니다');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // FCM 토큰 발급
            const token = await getFCMToken();
            if (!token) {
                setError('알림 권한을 허용해주세요');
                setIsLoading(false);
                return false;
            }

            // 디바이스 정보
            const deviceInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                subscribedAt: new Date().toISOString()
            };

            // Supabase에 토큰 저장
            const { error: dbError } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    fcm_token: token,
                    device_info: deviceInfo,
                    is_active: true
                }, {
                    onConflict: 'user_id,fcm_token'
                });

            if (dbError) {
                console.error('푸시 구독 저장 실패:', dbError);
                setError('구독 저장에 실패했습니다');
                setIsLoading(false);
                return false;
            }

            setIsSubscribed(true);
            setIsLoading(false);
            return true;
        } catch (e) {
            console.error('푸시 구독 실패:', e);
            setError('구독에 실패했습니다');
            setIsLoading(false);
            return false;
        }
    }, [user]);

    // 푸시 알림 구독 해제
    const unsubscribe = useCallback(async () => {
        if (!user) return false;

        setIsLoading(true);

        try {
            // 현재 토큰 비활성화
            const { error: dbError } = await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('user_id', user.id);

            if (dbError) {
                console.error('푸시 구독 해제 실패:', dbError);
                setIsLoading(false);
                return false;
            }

            setIsSubscribed(false);
            setIsLoading(false);
            return true;
        } catch (e) {
            console.error('푸시 구독 해제 실패:', e);
            setIsLoading(false);
            return false;
        }
    }, [user]);

    return {
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        canSubscribe: 'Notification' in window && 'serviceWorker' in navigator
    };
}
