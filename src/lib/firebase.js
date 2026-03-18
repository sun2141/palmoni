/**
 * Firebase FCM 관련 함수들
 * FCM 기능은 현재 비활성화되어 있습니다.
 * 브라우저 Notification API를 직접 사용합니다.
 */

export const messaging = null;

/**
 * FCM 토큰 가져오기 (비활성화)
 */
export async function getFCMToken() {
    console.log('FCM is currently disabled');
    return null;
}

/**
 * 포그라운드 메시지 리스너 (비활성화)
 */
export function onForegroundMessage(callback) {
    return () => {};
}
