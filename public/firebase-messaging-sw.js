// Firebase Messaging Service Worker
// 백그라운드 푸시 알림을 처리합니다

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase 설정
firebase.initializeApp({
    apiKey: "AIzaSyAzEYZYeKqF5l-ntO9l_RcQfc5nqjKC3iE",
    authDomain: "palmoni.firebaseapp.com",
    projectId: "palmoni",
    storageBucket: "palmoni.firebasestorage.app",
    messagingSenderId: "944968525864",
    appId: "1:944968525864:web:b8969229e5f8acf7516d1d"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

    const notificationTitle = payload.notification?.title || '🙏 팔모니가 기도 중입니다';
    const notificationOptions = {
        body: payload.notification?.body || '지금 팔모니가 당신을 위해 기도하고 있습니다.',
        icon: '/apple-touch-icon.png',
        badge: '/favicon-32.png',
        tag: 'palmoni-prayer',
        renotify: true,
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: '앱 열기'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 알림 클릭:', event);

    event.notification.close();

    // 앱으로 이동
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 이미 열린 창이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes('palmoni') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 없으면 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
