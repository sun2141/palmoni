/**
 * Firebase FCM 관련 함수들
 * Firebase SDK를 동적으로 로드하여 빌드 시 의존성 문제를 회피
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
 * Firebase 초기화 (lazy loading with error handling)
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
            // Dynamic import로 firebase 로드
            const firebaseApp_module = await import(/* @vite-ignore */ 'firebase/app');
            const firebaseMessaging_module = await import(/* @vite-ignore */ 'firebase/messaging');

            firebaseApp = firebaseApp_module.initializeApp(firebaseConfig);
            messaging = firebaseMessaging_module.getMessaging(firebaseApp);

            console.log('Firebase 초기화 성공');
            return { app: firebaseApp, messaging };
        } catch (error) {
            console.warn('Firebase 로드 실패 (정상적인 상황일 수 있음):', error.message);
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

        const { getToken } = await import(/* @vite-ignore */ 'firebase/messaging');

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
        const token = await getToken(msg, {
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
 */
export function onForegroundMessage(callback) {
    initFirebase().then(async ({ messaging: msg }) => {
        if (!msg) return;

        try {
            const { onMessage } = await import(/* @vite-ignore */ 'firebase/messaging');
            onMessage(msg, (payload) => {
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
