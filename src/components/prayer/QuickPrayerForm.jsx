import { PrayerProgress } from './PrayerProgress';

/**
 * 홈 화면의 기도 주제 입력 폼
 */
export function QuickPrayerForm({
  topic,
  onTopicChange,
  onGenerate,
  isGenerating,
  showPrayingAnimation,
  progress,
  rateLimitInfo,
  user,
  todaysPrayerCount,
}) {
  return (
    <>
      {/* 기도 중 애니메이션 */}
      {(isGenerating || showPrayingAnimation) && (
        <div className="praying-indicator">
          <div className="praying-animation">
            <span className="praying-hands">🙏</span>
            <span className="praying-text">누군가 당신을 위해 기도하고 있어요...</span>
          </div>
          {progress > 0 && <PrayerProgress currentStep={progress} />}
        </div>
      )}

      {/* Input Section */}
      <div className="prayer-input-section">
        <div className="input-header">
          <span className="input-icon">✏️</span>
          <span className="input-label">오늘의 기도</span>
          {todaysPrayerCount > 0 && (
            <span className="today-count">오늘 {todaysPrayerCount}번째</span>
          )}
        </div>
        <textarea
          className="prayer-textarea"
          placeholder="마음에 담긴 이야기를 나눠주세요..."
          aria-label="기도 주제 입력"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          disabled={isGenerating}
          rows={3}
        />
        <button
          className="pray-cta-btn"
          aria-label={isGenerating ? '기도문 생성 중' : '기도문 함께 생성하기'}
          onClick={onGenerate}
          disabled={isGenerating || !topic.trim()}
        >
          {isGenerating ? '🙏 기도하는 중...' : '🙏 함께 기도하기'}
        </button>
        {rateLimitInfo && user && (
          <div className="remaining-count">
            오늘 남은 횟수: <strong>{rateLimitInfo.remaining || 0}</strong>/{rateLimitInfo.limit || 3}회
          </div>
        )}
      </div>
    </>
  );
}
