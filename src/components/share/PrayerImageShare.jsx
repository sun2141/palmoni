import { useState, useRef, useCallback } from 'react';
import './PrayerImageShare.css';

/**
 * 기도문을 아름다운 이미지로 변환하여 공유하는 컴포넌트
 */
export function PrayerImageShare({ prayer, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('dawn');
  const canvasRef = useRef(null);

  const themes = [
    { id: 'dawn', name: '새벽', gradient: ['#667eea', '#764ba2'], textColor: '#ffffff' },
    { id: 'peace', name: '평안', gradient: ['#a8edea', '#fed6e3'], textColor: '#4a5568' },
    { id: 'hope', name: '소망', gradient: ['#ffecd2', '#fcb69f'], textColor: '#744210' },
    { id: 'grace', name: '은혜', gradient: ['#d299c2', '#fef9d7'], textColor: '#553c7d' },
    { id: 'night', name: '밤', gradient: ['#0f0c29', '#302b63', '#24243e'], textColor: '#e2e8f0' },
  ];

  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[0];

  // 텍스트 줄바꿈 처리
  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // 이미지 생성
  const generateImage = useCallback(async () => {
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 캔버스 크기 (인스타그램 스토리 비율)
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    currentTheme.gradient.forEach((color, i) => {
      gradient.addColorStop(i / (currentTheme.gradient.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 반투명 오버레이 (가독성)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(60, 200, width - 120, height - 400);

    // 제목
    ctx.fillStyle = currentTheme.textColor;
    ctx.font = 'bold 56px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';

    const titleLines = wrapText(ctx, prayer.title, width - 160);
    let y = 320;
    titleLines.forEach(line => {
      ctx.fillText(line, width / 2, y);
      y += 70;
    });

    // 구분선
    y += 30;
    ctx.strokeStyle = currentTheme.textColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 100, y);
    ctx.lineTo(width / 2 + 100, y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 본문
    y += 80;
    ctx.font = '36px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';

    const contentLines = wrapText(ctx, prayer.content, width - 200);
    const lineHeight = 56;
    const maxLines = Math.floor((height - y - 300) / lineHeight);

    contentLines.slice(0, maxLines).forEach(line => {
      ctx.fillText(line, 100, y);
      y += lineHeight;
    });

    // Palmoni 로고/서명
    ctx.font = '28px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.7;
    ctx.fillText('Palmoni - 누군가 당신과 함께 기도합니다', width / 2, height - 120);
    ctx.globalAlpha = 1;

    setIsGenerating(false);
    return canvas;
  }, [prayer, currentTheme]);

  // 이미지 저장
  const handleSaveImage = async () => {
    const canvas = await generateImage();

    try {
      // 모바일에서 다운로드
      const link = document.createElement('a');
      link.download = `palmoni-prayer-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('이미지 저장 실패:', err);
    }
  };

  // 이미지 공유
  const handleShareImage = async () => {
    const canvas = await generateImage();

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'palmoni-prayer.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: prayer.title,
          text: '함께 기도해주세요'
        });
      } else {
        // 폴백: 이미지 저장
        handleSaveImage();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('공유 실패:', err);
        handleSaveImage();
      }
    }
  };

  return (
    <div className="prayer-image-share-overlay" onClick={onClose}>
      <div className="prayer-image-share-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h2>기도문 이미지로 나누기</h2>
        <p className="subtitle">마음을 담은 기도문을 아름다운 이미지로 만들어 나눠보세요</p>

        {/* 테마 선택 */}
        <div className="theme-selector">
          {themes.map(theme => (
            <button
              key={theme.id}
              className={`theme-btn ${selectedTheme === theme.id ? 'active' : ''}`}
              onClick={() => setSelectedTheme(theme.id)}
              style={{
                background: `linear-gradient(135deg, ${theme.gradient.join(', ')})`
              }}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* 미리보기 */}
        <div
          className="image-preview"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.gradient.join(', ')})`
          }}
        >
          <div className="preview-content" style={{ color: currentTheme.textColor }}>
            <h3>{prayer.title}</h3>
            <p>{prayer.content.substring(0, 100)}...</p>
            <span className="watermark">Palmoni</span>
          </div>
        </div>

        {/* 숨겨진 캔버스 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 액션 버튼 */}
        <div className="share-actions">
          <button
            className="action-btn save"
            onClick={handleSaveImage}
            disabled={isGenerating}
          >
            {isGenerating ? '생성 중...' : '이미지 저장'}
          </button>
          <button
            className="action-btn share"
            onClick={handleShareImage}
            disabled={isGenerating}
          >
            {isGenerating ? '생성 중...' : '바로 공유하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
