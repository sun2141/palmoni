/**
 * 한국 시간(KST, UTC+9) 날짜 유틸리티
 * 모든 KST 날짜 계산은 이 파일에서만 수행한다
 */

/**
 * 한국 시간(KST) 기준 오늘 날짜 반환 (YYYY-MM-DD)
 */
export function getTodayKST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/**
 * 한국 시간(KST) 기준 어제 날짜 반환 (YYYY-MM-DD)
 */
export function getYesterdayKST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    new Date(Date.now() - 86400000)
  );
}

/**
 * 주어진 날짜 문자열이 KST 기준 오늘인지 확인
 * @param {string} dateString - ISO 날짜 문자열
 * @returns {boolean}
 */
export function isToday(dateString) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    new Date(dateString)
  );
  return date === getTodayKST();
}
