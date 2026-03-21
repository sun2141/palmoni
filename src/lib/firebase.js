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
let messageUnsubscribe = null;

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
    // 이미 초기화 완료된 경우
    if (firebaseApp && messaging) {
        return { app: firebaseApp, messaging };
    }

    // 초기화 진행 중인 경우 - 완료될 때까지 대기
    if (initPromise) {
        return initPromise;
    }

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
                initPromise = null; // 재시도 가능하도록
                return { app: null, messaging: null };
            }

            // 이미 초기화되어 있는지 확인
            try {
                firebaseApp = window.firebase.app();
            } catch {
                firebaseApp = window.firebase.initializeApp(firebaseConfig);
            }

            messaging = window.firebase.messaging();

            console.log('Firebase 초기화 성공');
            return { app: firebaseApp, messaging };
        } catch (error) {
            console.warn('Firebase 로드 실패:', error.message);
            initPromise = null; // 재시도 가능하도록
            return { app: null, messaging: null };
        }
    })();

    return initPromise;
}

/**
 * Firebase Service Worker 등록
 */
async function registerFirebaseServiceWorker() {
    try {
        // 먼저 firebase-messaging-sw.js가 등록되어 있는지 확인
        const registrations = await navigator.serviceWorker.getRegistrations();
        let firebaseSW = registrations.find(reg =>
            reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
        );

        if (firebaseSW) {
            console.log('Firebase Service Worker 이미 등록됨');
            return firebaseSW;
        }

        // 새로 등록
        firebaseSW = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging-push-scope'
        });

        // 활성화 대기
        await navigator.serviceWorker.ready;
        console.log('Firebase Service Worker 등록 성공');
        return firebaseSW;
    } catch (error) {
        console.error('Firebase Service Worker 등록 실패:', error);
        return null;
    }
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

        // Firebase Service Worker 등록
        const registration = await registerFirebaseServiceWorker();
        if (!registration) {
            console.warn('Firebase Service Worker를 등록할 수 없습니다');
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
export async function onForegroundMessage(callback) {
    try {
        const { messaging: msg } = await initFirebase();
        if (!msg) {
            console.log('FCM 사용 불가 - 포그라운드 리스너 미설정');
            return () => {};
        }

        // 기존 리스너가 있으면 정리 (중복 방지)
        if (messageUnsubscribe) {
            console.log('기존 포그라운드 리스너 정리');
        }

        // 새 리스너 설정
        messageUnsubscribe = msg.onMessage((payload) => {
            console.log('포그라운드 메시지 수신:', payload);
            callback(payload);
        });

        console.log('포그라운드 메시지 리스너 설정 완료');

        return () => {
            if (messageUnsubscribe) {
                // Firebase compat SDK는 unsubscribe 함수를 반환하지 않으므로
                // 단순히 참조 정리
                messageUnsubscribe = null;
            }
        };
    } catch (error) {
        console.warn('포그라운드 메시지 리스너 설정 실패:', error);
        return () => {};
    }
}

/**
 * FCM 지원 여부 확인
 */
export function isFCMSupported() {
    return typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;
}

export { messaging };
