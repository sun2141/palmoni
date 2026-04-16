import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';
import { logger } from '../../lib/logger';

/**
 * 기도문 생성 결과 카드
 */
export function PrayerResultCard({
  title,
  content,
  user,
  currentPrayerId,
  isGenerating,
  onRegenerate,
  onReset,
}) {
  const navigate = useNavigate();
  const toast = useToast();

  if (!title && !content) return null;
  if (isGenerating) return null;

  return (
    <div className="prayer-result-card">
      <div className="result-header">
        <span className="result-icon">✨</span>
        <span className="result-label">오늘의 기도</span>
      </div>

      {title && <h2 className="result-title">{title}</h2>}

      {content && (
        <div className="result-content">
          {content}
        </div>
      )}

      <div className="result-actions">
        {user && currentPrayerId && (
          <button
            className="action-btn"
            aria-label="기도문 다시 생성"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            <span className="action-icon">🔄</span>
            <span className="action-text">다시 생성</span>
          </button>
        )}
        <button
          className="action-btn"
          aria-label="기도문 복사"
          onClick={async () => {
            const text = `${title}\n\n${content}\n\n- Palmoni와 함께 기도했습니다`;
            await navigator.clipboard.writeText(text);
            toast.success('기도문이 복사되었습니다!');
          }}
        >
          <span className="action-icon">📋</span>
          <span className="action-text">복사</span>
        </button>
        <button
          className="action-btn"
          aria-label="기도문 공유"
          onClick={async () => {
            const shareText = `${title}\n\n${content}`;
            if (navigator.share) {
              try {
                await navigator.share({ title, text: shareText });
              } catch (err) {
                if (err.name !== 'AbortError') logger.warn('Share failed:', err);
              }
            } else {
              await navigator.clipboard.writeText(shareText);
              toast.success('기도문이 복사되었습니다!');
            }
          }}
        >
          <span className="action-icon">📤</span>
          <span className="action-text">공유</span>
        </button>
        <button
          className="action-btn"
          aria-label="새 기도 작성"
          onClick={onReset}
        >
          <span className="action-icon">🙏</span>
          <span className="action-text">새 기도</span>
        </button>
      </div>

      {/* 기도 여정 유도 배너 */}
      {user && (
        <div className="journey-prompt">
          <div className="journey-prompt-content">
            <span className="journey-prompt-icon">🌱</span>
            <div className="journey-prompt-text">
              <strong>이 기도를 매일 이어가볼까요?</strong>
              <span>7일간 함께 기도하며 깊어지는 여정</span>
            </div>
          </div>
          <button
            className="journey-prompt-btn"
            aria-label="매일 기도 시작하기"
            onClick={() => navigate('/loop/history')}
          >
            시작하기
          </button>
        </div>
      )}
    </div>
  );
}
