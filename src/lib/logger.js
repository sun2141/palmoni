/**
 * 개발 환경에서만 로그를 출력하는 래퍼
 * 프로덕션 빌드에서는 모든 로그가 no-op으로 처리된다
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: isDev ? (...args) => console.log(...args) : () => {},
  warn: isDev ? (...args) => console.warn(...args) : () => {},
  error: (...args) => console.error(...args), // 에러는 항상 출력
};
