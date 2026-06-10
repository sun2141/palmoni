# Palmoni - Agent Instructions

> 이름 없는 존재가 당신을 위해 기도합니다 — Palmoni 기도앱 프로젝트 전용 Agent 지침

## 프로젝트 개요

**Palmoni** - 매일 AI가 개인 맞춤 기도문을 생성하고 음성으로 전달하는 기도앱

| 항목 | 내용 |
|------|------|
| 프론트엔드 | React 18 + Vite 5, Tailwind CSS 4 |
| 백엔드 | Vercel Serverless Functions |
| 데이터베이스 | Supabase (Auth + PostgreSQL) |
| AI | Google Generative AI (`@google/generative-ai`) |
| 라우팅 | react-router-dom v6 |
| 스타일 유틸 | tailwind-merge, clsx, class-variance-authority |
| 로컬 서버 | Express 5 (`server.js`, API 테스트용) |
| 배포 | Vercel (palmoni.vercel.app) |
| 테스트 | Vitest + @testing-library/react |

> **주의**: Framer Motion과 Stripe는 현재 `package.json`에 없습니다. 결제/애니메이션 기능 추가 시 별도 설치 필요.

---

## 디렉토리 구조

```
palmoni/
├── src/
│   ├── components/
│   │   ├── ads/            # 광고 컴포넌트
│   │   ├── auth/           # 로그인/인증
│   │   ├── common/         # 공통 컴포넌트
│   │   ├── emergency/      # 긴급 기도 기능
│   │   ├── home/           # 홈 화면 컴포넌트
│   │   ├── loop/           # 반복 기도 기능
│   │   ├── prayer/         # 기도문 관련 UI
│   │   ├── share/          # 공유 기능
│   │   ├── streak/         # 연속 기도 기록
│   │   ├── ui/             # 공통 UI 요소 (버튼, 카드 등)
│   │   └── voice/          # 음성 출력 UI
│   ├── contexts/
│   │   └── AuthContext.jsx # 인증 상태 관리
│   ├── hooks/              # Custom Hooks (use*.js, 9개)
│   │   └── __tests__/      # Hook 단위 테스트
│   ├── lib/                # 유틸리티 모듈
│   │   ├── dateUtils.js
│   │   ├── localStorage.js
│   │   ├── logger.js
│   │   ├── supabaseClient.js
│   │   └── utils.js
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Home.jsx
│   │   ├── MyPrayers.jsx
│   │   ├── Admin.jsx
│   │   ├── Pricing.jsx
│   │   ├── Privacy.jsx
│   │   └── Terms.jsx
│   └── test/               # 통합 테스트
├── api/                    # Vercel Serverless Functions
│   ├── generate-prayer*.js # 기도문 생성 API
│   ├── background-activities.js
│   ├── admin/              # 관리자 API
│   └── lib/                # API 공통 유틸
├── public/                 # 정적 파일
│   ├── manifest.json       # PWA 매니페스트
│   ├── sw.js               # 서비스 워커
│   └── offline.html        # 오프라인 페이지
├── supabase/
│   └── migrations/         # DB 마이그레이션 SQL 파일
├── lib/                    # 기타 스크립트
├── server.js               # 로컬 Express 서버
└── vercel.json             # Vercel 배포 설정
```

---

## 개발 명령어

```bash
npm run dev           # 개발 서버 시작 (Vite, localhost:5173)
npm run server        # Express 로컬 서버 시작 (API 테스트용)
npm run build         # 프로덕션 빌드
npm run lint          # ESLint 검사 (--max-warnings 0, 경고 0개 유지)
npm run preview       # 빌드 결과물 미리보기
npm run test          # Vitest 테스트 단일 실행
npm run test:watch    # Vitest 워치 모드
npm run test:coverage # Vitest 커버리지 측정
```

---

## 환경 변수

`.env.local` 필수 변수:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

> `.env` 파일은 절대 커밋하지 않습니다. `.gitignore`에 포함되어야 합니다.

---

## 코딩 컨벤션

- **파일 확장자**: 컴포넌트는 `.jsx`, 유틸/훅은 `.js`
- **ESLint**: `--max-warnings 0` — 경고 0개 유지, 빌드 전 반드시 통과
- **테스트**: Vitest 기반, `src/hooks/__tests__/` 및 `src/test/` 위치
- **커밋 메시지**: 한국어 사용, Conventional Commits 형식 (feat:, fix:, refactor: 등)
- **주석**: 한국어 사용
- **로깅**: `console.log` 대신 `src/lib/logger.js` 사용

---

## 주의사항

### Vercel Serverless 제약
- `vercel.json` 기준 `maxDuration: 30초`, `memory: 1024MB`
- API 함수는 30초 이내 응답해야 함
- 스트리밍 응답 또는 분할 처리로 긴 작업 대응

### Supabase 스키마 변경
- DDL 변경은 반드시 `supabase/migrations/` 에 SQL 파일로 추가
- 직접 DB 수정 금지, 마이그레이션 파일 통해 적용

### 금지 사항
- `.env` 파일 커밋 금지
- 하드코딩된 API 키/시크릿 금지
- 기존 테스트 삭제 또는 스킵 금지
- `node_modules/`, `dist/` 커밋 금지

---

## Git 정보

- **Repository**: sun2141/palmoni
- **Branch**: master (production)
- **커밋 형식**: `feat: 한국어 설명` (Conventional Commits)
