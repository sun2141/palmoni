/**
 * Local Storage utilities for Palmoni
 *
 * 용도:
 * 1. 비로그인 사용자의 기도문 미리보기 임시 저장
 * 2. 로그인 후 기존 기도문 복원
 * 3. 세션 데이터 백업
 */

const STORAGE_KEYS = {
  PENDING_PRAYER: 'palmoni_pending_prayer',
  LAST_TOPIC: 'palmoni_last_topic',
  ANONYMOUS_ID: 'palmoni_anonymous_id',
};

/**
 * 미리보기 기도문 임시 저장 (로그인 전)
 */
export function savePendingPrayer(prayerData) {
  try {
    const data = {
      ...prayerData,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.PENDING_PRAYER, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Error saving pending prayer:', err);
    return false;
  }
}

/**
 * 저장된 미리보기 기도문 가져오기
 */
export function getPendingPrayer() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_PRAYER);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // 24시간 이내 데이터만 유효
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      clearPendingPrayer();
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('Error getting pending prayer:', err);
    return null;
  }
}

/**
 * 미리보기 기도문 삭제
 */
export function clearPendingPrayer() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_PRAYER);
    return true;
  } catch (err) {
    console.error('Error clearing pending prayer:', err);
    return false;
  }
}

/**
 * 마지막 입력한 주제 저장
 */
export function saveLastTopic(topic) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_TOPIC, topic);
    return true;
  } catch (err) {
    console.error('Error saving last topic:', err);
    return false;
  }
}

/**
 * 마지막 입력한 주제 가져오기
 */
export function getLastTopic() {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_TOPIC) || '';
  } catch (err) {
    console.error('Error getting last topic:', err);
    return '';
  }
}

/**
 * 익명 ID 생성/가져오기
 */
export function getOrCreateAnonymousId() {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);

    if (!id) {
      // 브라우저 핑거프린트 기반 ID 생성
      const fingerprint = `${navigator.userAgent}_${screen.width}x${screen.height}_${new Date().getTime()}`;
      id = btoa(fingerprint).substring(0, 32);
      localStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, id);
    }

    return id;
  } catch (err) {
    console.error('Error with anonymous ID:', err);
    // 폴백: 임시 ID 반환
    return btoa(`fallback_${Date.now()}`).substring(0, 32);
  }
}

/**
 * 익명 ID 삭제 (로그인 후)
 */
export function clearAnonymousId() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ANONYMOUS_ID);
    return true;
  } catch (err) {
    console.error('Error clearing anonymous ID:', err);
    return false;
  }
}
