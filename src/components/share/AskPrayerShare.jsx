import { useState } from 'react';
import './AskPrayerShare.css';

/**
 * 친구에게 기도 부탁하기 - 자연스럽고 따뜻한 공유
 */
export function AskPrayerShare({ prayer, onClose }) {
  const [selectedMessage, setSelectedMessage] = useState(0);
  const [customNote, setCustomNote] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // 따뜻하고 자연스러운 메시지 템플릿
  const messageTemplates = [
    {
      id: 0,
      label: '조용히 부탁드려요',
      message: (title, note) => `혹시 시간 되실 때 이 기도 제목 한 번만 기억해주실 수 있을까요?\n\n"${title}"${note ? `\n\n${note}` : ''}\n\n감사합니다 🙏`
    },
    {
      id: 1,
      label: '함께 기도해요',
      message: (title, note) => `요즘 이 기도 제목을 마음에 담고 있어요.\n\n"${title}"${note ? `\n\n${note}` : ''}\n\n함께 기도해주시면 큰 힘이 될 것 같아요.`
    },
    {
      id: 2,
      label: '기도 나눔',
      message: (title, note) => `기도 제목 나눔드려요.\n\n"${title}"${note ? `\n\n${note}` : ''}\n\n마음 가시는 대로 기도해주시면 감사하겠습니다.`
    }
  ];

  const currentTemplate = messageTemplates[selectedMessage];
  const finalMessage = currentTemplate.message(prayer.topic || prayer.title, customNote);

  // 클립보드 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // 공유하기
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: finalMessage
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // 카카오톡으로 공유 (딥링크)
  const handleKakaoShare = () => {
    const encodedMessage = encodeURIComponent(finalMessage);
    // 카카오톡 공유 URL scheme
    window.location.href = `kakaotalk://msg/text/send?text=${encodedMessage}`;

    // 카카오톡이 없으면 일반 공유
    setTimeout(() => {
      handleShare();
    }, 500);
  };

  return (
    <div className="ask-prayer-overlay" onClick={onClose}>
      <div className="ask-prayer-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="modal-header">
          <span className="header-icon">🙏</span>
          <h2>기도 부탁 나누기</h2>
          <p>소중한 분에게 기도를 부탁해보세요</p>
        </div>

        {/* 기도 제목 표시 */}
        <div className="prayer-topic-display">
          <span className="topic-label">기도 제목</span>
          <p className="topic-text">{prayer.topic || prayer.title}</p>
        </div>

        {/* 메시지 스타일 선택 */}
        <div className="message-style-selector">
          <span className="selector-label">메시지 스타일</span>
          <div className="style-buttons">
            {messageTemplates.map(template => (
              <button
                key={template.id}
                className={`style-btn ${selectedMessage === template.id ? 'active' : ''}`}
                onClick={() => setSelectedMessage(template.id)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 메모 (선택) */}
        <div className="custom-note-section">
          <label className="note-label">
            한 마디 더하기 <span className="optional">(선택)</span>
          </label>
          <textarea
            className="note-input"
            placeholder="상황이나 마음을 간단히 적어보세요..."
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            maxLength={100}
          />
          <span className="char-count">{customNote.length}/100</span>
        </div>

        {/* 미리보기 */}
        <div className="message-preview">
          <span className="preview-label">미리보기</span>
          <div className="preview-content">
            {finalMessage}
          </div>
        </div>

        {/* 공유 버튼들 */}
        <div className="share-buttons">
          <button className="share-btn kakao" onClick={handleKakaoShare}>
            <span className="btn-icon">💬</span>
            카카오톡
          </button>
          <button className="share-btn copy" onClick={handleCopy}>
            <span className="btn-icon">{isCopied ? '✓' : '📋'}</span>
            {isCopied ? '복사됨!' : '복사하기'}
          </button>
          <button className="share-btn share" onClick={handleShare}>
            <span className="btn-icon">📤</span>
            공유
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="gentle-reminder">
          기도 부탁은 서로의 짐을 나누는 아름다운 방법이에요
        </p>
      </div>
    </div>
  );
}
