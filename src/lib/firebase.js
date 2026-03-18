import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyAzEYZYeKqF5l-ntO9l_RcQfc5nqjKC3iE",
    authDomain: "palmoni.firebaseapp.com",
    projectId: "palmoni",
    storageBucket: "palmoni.firebasestorage.app",
    messagingSenderId: "944968525864",
    appId: "1:944968525864:web:b8969229e5f8acf7516d1d",
    measurementId: "G-Y5VHTSD4HY"
};

const VAPID_KEY = 'BBUhUZGnGAa9n6szH5F9IgTD88ZXJvNDSwgN8SWyFhokjF3DifE_WcSm2qlDpT-rs_CA6DVBq-EVXEueZDh2XyI';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;

// FCM은 브라우저에서만 작동
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
    } catch (error) {
        console.warn('FCM 초기화 실패:', error);
    }
}

/**
 * FCM 토큰 가져오기
 * 사용자가 알림을 허용하면 토큰을 발급받습니다.
 */
export async function getFCMToken() {
    if (!messaging) {
        console.warn('FCM이 지원되지 않는 환경입니다');
        return null;
    }

    try {
        // 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('알림 권한이 거부되었습니다');
            return null;
        }

        // Service Worker 등록 확인
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            console.warn('Service Worker가 등록되지 않았습니다');
            return null;
        }

        // FCM 토큰 가져오기
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM 토큰 발급 성공');
            return token;
        } else {
            console.warn('FCM 토큰을 가져올 수 없습니다');
            return null;
        }
    } catch (error) {
        console.error('FCM 토큰 발급 실패:', error);
        return null;
    }
}

/**
 * 포그라운드 메시지 리스너 설정
 * 앱이 열려있을 때 푸시 메시지 수신
 */
export function onForegroundMessage(callback) {
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        callback(payload);
    });
}

export { messaging };
