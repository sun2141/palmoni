/**
 * 비로그인 사용자 회원가입 유도 섹션
 */
export function SignupPrompt({ onLogin }) {
    return (
        <div className="signup-prompt">
            <p>
                <strong>무료 회원가입</strong>하시면 기도문이 저장되고, 기도 기록이 남아요
            </p>
            <div className="signup-benefits">
                <span className="benefit-item">✓ 매일 함께 기도</span>
                <span className="benefit-item">✓ 기도문 자동 저장</span>
                <span className="benefit-item">✓ 연속 기도 기록</span>
            </div>
            <button
                className="signup-cta-btn"
                aria-label="무료 회원가입 시작"
                onClick={onLogin}
            >
                ✨ 무료로 시작하기
            </button>
        </div>
    );
}

/**
 * 어제 기도 완료 배너
 */
export function YesterdayBanner({ onDismiss }) {
    return (
        <div className="yesterday-banner">
            <div className="yesterday-content">
                <span className="yesterday-icon">✨</span>
                <span className="yesterday-text">
                    <strong>어제도 함께 기도했어요</strong>
                    <br />
                    오늘도 기도해볼까요?
                </span>
            </div>
            <button
                className="yesterday-dismiss"
                aria-label="어제 기도 알림 닫기"
                onClick={onDismiss}
            >
                확인
            </button>
        </div>
    );
}
