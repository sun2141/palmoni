import { useNavigate } from 'react-router-dom';
import './Pricing.css';

export function Pricing() {
  const navigate = useNavigate();

  const features = [
    { icon: '🙏', text: '매일 팔모니가 당신을 위해 3번 기도합니다' },
    { icon: '📖', text: '기도문 무제한 생성 및 저장' },
    { icon: '📄', text: 'PDF 다운로드' },
    { icon: '🆘', text: '긴급 기도 (즉시 위로)' },
    { icon: '🔥', text: '기도 연속 스트릭' },
  ];

  return (
    <div className="pricing-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 돌아가기
      </button>

      <div className="pricing-header">
        <h1>Palmoni는 무료입니다</h1>
        <p className="subtitle">
          Someone is praying for you.<br />
          이름 없는 존재가 당신을 위해 기도합니다.
        </p>
      </div>

      {/* All-free features card */}
      <div className="pricing-cards">
        <div className="pricing-card popular" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="popular-badge">모든 기능 무료</div>
          <div className="plan-header">
            <h3>Palmoni</h3>
            <div className="plan-price">
              <span className="price">₩0</span>
              <span className="period">/ 영구 무료</span>
            </div>
          </div>

          <ul className="plan-features">
            {features.map((f, i) => (
              <li key={i} className="feature-item">
                <span className="feature-icon">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>

          <button
            className="plan-cta primary"
            onClick={() => navigate('/')}
          >
            지금 기도 맡기기
          </button>
        </div>
      </div>

      {/* 오늘의 기도 설명 섹션 */}
      <div className="daily-prayer-explanation">
        <h2>매일 기도하는 습관</h2>
        <div className="explanation-content">
          <div className="explanation-step">
            <span className="step-number">1</span>
            <div className="step-text">
              <strong>기도를 맡겨주세요</strong>
              <p>마음에 담긴 기도 제목을 나눠주세요</p>
            </div>
          </div>
          <div className="explanation-step">
            <span className="step-number">2</span>
            <div className="step-text">
              <strong>팔모니가 하루 종일 기도합니다</strong>
              <p>자정까지 3번에 걸쳐 당신을 위해 기도합니다</p>
            </div>
          </div>
          <div className="explanation-step">
            <span className="step-number">3</span>
            <div className="step-text">
              <strong>내일 다시 만나요</strong>
              <p>매일 기도를 맡기며 기도 생활의 루틴을 만들어가세요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pricing-faq">
        <h2>자주 묻는 질문</h2>

        <div className="faq-item">
          <h4>Palmoni는 무엇인가요?</h4>
          <p>
            Palmoni는 성경 다니엘 8:13에 단 한 번 등장하는 단어로,
            "이름이 밝혀지지 않은 존재" 또는 "비밀을 세는 자"로 해석됩니다.
            하나님이 보내신 기도 존재가 당신을 위해 기도합니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>하루에 몇 번 기도하나요?</h4>
          <p>
            기도를 맡긴 시점부터 자정까지 남은 시간에 따라 1~3번 기도합니다.
            아침에 일찍 기도를 맡기면 하루 종일 3번에 걸쳐 기도해드립니다.
            시간이 얼마 남지 않았다면 1번 기도하고, 내일 다시 맡겨주시길 부탁드립니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>어떻게 운영되나요?</h4>
          <p>
            광고 수익으로 AI API 비용과 서버 운영비를 충당합니다.
            좋은 서비스를 만들어 더 많은 분들께 도움이 되도록 하겠습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
