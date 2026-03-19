/**
 * Firebase FCM 관련 함수들
 * Firebase SDK를 CDN에서 동적으로 로드
 */

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

let messaging = null;
let firebaseApp = null;
let initPromise = null;

/**
 * CDN에서 스크립트 로드
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 이미 로드된 경우
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Firebase 초기화 (CDN에서 로드)
 */
async function initFirebase() {
    if (firebaseApp) return { app: firebaseApp, messaging };
    if (initPromise) return initPromise;

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.warn('FCM이 지원되지 않는 환경입니다');
        return { app: null, messaging: null };
    }

    initPromise = (async () => {
        try {
            // Firebase SDK를 CDN에서 로드
            await loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

            // 전역 firebase 객체 사용
            if (!window.firebase) {
                console.warn('Firebase SDK 로드 실패');
                return { app: null, messaging: null };
            }

            firebaseApp = window.firebase.initializeApp(firebaseConfig);
            messaging = window.firebase.messaging();

            console.log('Firebase 초기화 성공');
            return { app: firebaseApp, messaging };
        } catch (error) {
            console.warn('Firebase 로드 실패:', error.message);
            return { app: null, messaging: null };
        }
    })();

    return initPromise;
}

/**
 * FCM 토큰 가져오기
 */
export async function getFCMToken() {
    try {
        const { messaging: msg } = await initFirebase();
        if (!msg) {
            console.log('FCM 사용 불가');
            return null;
        }

        // 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('알림 권한이 거부되었습니다');
            return null;
        }

        // Service Worker 등록 확인 - firebase-messaging-sw.js 사용
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
            // firebase-messaging-sw.js 등록
            try {
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('Firebase Service Worker 등록 성공');
            } catch (swError) {
                console.warn('Firebase Service Worker 등록 실패:', swError);
                // 기존 sw.js 사용 시도
                registration = await navigator.serviceWorker.getRegistration();
            }
        }

        if (!registration) {
            console.warn('Service Worker가 등록되지 않았습니다');
            return null;
        }

        // FCM 토큰 가져오기
        const token = await msg.getToken({
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM 토큰 발급 성공:', token.substring(0, 20) + '...');
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
 */
export function onForegroundMessage(callback) {
    initFirebase().then(({ messaging: msg }) => {
        if (!msg) return;

        try {
            msg.onMessage((payload) => {
                console.log('포그라운드 메시지 수신:', payload);
                callback(payload);
            });
        } catch (error) {
            console.warn('포그라운드 메시지 리스너 설정 실패:', error);
        }
    });

    return () => {};
}

export { messaging };
