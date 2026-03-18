# Palmoni - Agent Instructions

> 이 파일은 Palmoni 기도앱 프로젝트 전용 Agent 지침입니다.

## Project Overview

**Palmoni** - "이름 없는 존재가 당신을 위해 기도합니다"

- **Tech Stack**: React 18 + Vite, Tailwind CSS, Framer Motion
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (Auth + PostgreSQL)
- **APIs**: Google Gemini (기도문 생성), Google TTS, Stripe (결제)
- **Deployment**: Vercel (palmoni.vercel.app)

## Project Structure

```
palmoni/
├── src/
│   ├── components/     # React 컴포넌트
│   │   ├── auth/       # 로그인/인증
│   │   ├── donation/   # 후원 기능
│   │   ├── prayer/     # 기도 관련 UI
│   │   ├── schedule/   # 예약 기도
│   │   ├── tts/        # 음성 출력
│   │   └── ui/         # 공통 UI 컴포넌트
│   ├── contexts/       # React Context (Auth 등)
│   ├── hooks/          # Custom Hooks
│   ├── lib/            # 유틸리티 (Supabase 클라이언트)
│   └── pages/          # 페이지 컴포넌트
├── api/                # Vercel Serverless Functions
│   ├── stripe/         # 결제 API
│   ├── tts/            # 음성 생성 API
│   └── cron/           # 스케줄 작업
├── supabase/           # DB 마이그레이션
└── lib/                # Python 스크립트 (기도문 생성)
```

## Development Commands

```bash
npm run dev        # 개발 서버 (Vite)
npm run build      # 프로덕션 빌드
npm run test       # 테스트 실행
npm run server     # Express 서버 (로컬 API 테스트용)
```

## Environment Variables

`.env.local` 필수 변수:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Agent Guidelines

### 이 프로젝트에서 작업 시

1. **앱 개발에 집중** - UI/UX, 기능 구현, 버그 수정
2. **Vercel 배포 고려** - Serverless 함수 제약 (10초 타임아웃 등)
3. **Supabase 스키마 변경 시** - `supabase/migrations/`에 SQL 파일 추가
4. **테스트 작성** - `src/**/__tests__/` 에 위치

### 금지 사항

- 이 프로젝트에서 자동화/인프라 작업 하지 말 것
- `directives/`, `execution/` 폴더 건드리지 말 것 (해당 없음)

---

## Central Hub Connection

이 프로젝트는 **agent-hub** (`/Users/sun/agent-hub/`)와 연결됩니다.

**연결 방식**:
- agent-hub가 이 프로젝트를 모니터링
- 오류 발생 시 자동 감지 및 알림
- Hetzner VPS의 `~/workspace/prayer-app/`과 동기화

**참조 문서**:
- 전체 인프라: `/Users/sun/agent-hub/CLAUDE.md`
- 자동화 레지스트리: `/Users/sun/agent-hub/directives/automation_registry.md`

---

## Git Info

- **Repository**: sun2141/palmoni
- **Branch Strategy**: main (production)

---

## Recent Session Log (2026-03-18)

### 완료된 작업

#### 1. PWA 설정
- vite-plugin-pwa 대신 수동 PWA 설정 (빌드 오류로 인해)
- `public/manifest.json` 생성
- `public/sw.js` 서비스 워커 생성 (v2 - 스마트 캐싱)
- `public/offline.html` 오프라인 페이지 생성

#### 2. 앱 안정성 개선 (백그라운드 복귀 시)
- `useTodaysPrayer.js`: 5분 이상 백그라운드 후 상태 새로고침
- `MyPrayers.jsx`: visibilitychange 핸들러 추가
- `AuthContext.jsx`: 세션 유효성 검사 추가
- `sw.js`: Supabase/외부 API는 절대 캐시하지 않음

#### 3. 공유 기능 추가
- 로그인 전: 상단 바 왼쪽에 공유 버튼 (원형 아이콘)
- 로그인 후: 하단 네비게이션에 공유 버튼 (아이콘만)
- Web Share API 사용, 미지원 시 클립보드 복사

#### 4. Open Graph 메타 태그
- `og:image`, `og:title`, `og:description` 추가
- Twitter Card 메타 태그 추가
- `public/og-image.png` 추가 (icon-512 복사본, 추후 교체 권장)

#### 5. iOS Safari 공유 시트 아이콘
- `apple-touch-icon` 링크 다양하게 추가
- `apple-touch-icon-precomposed` 추가
- 캐시 문제로 테스트 시 Safari 캐시 초기화 필요

#### 6. UI 텍스트 변경
- "무료로 시작하기" → "로그인하기"
- "하루 종일" → "하루 동안"
- 회원가입 문구 한 줄로 변경
- 3가지 혜택 포인트 가로 정렬

### 남은 작업 / 확인 필요

1. **iOS 공유 시트 아이콘**: Safari 캐시 초기화 후 재테스트 필요
2. **OG 이미지**: 현재 512x512 아이콘 사용 중, 1200x630 이미지로 교체 권장

### 최근 커밋

```
09cbf90 Remove temporary PDF file
2a5a3bc Fix: Improve iOS Safari share sheet icon detection
f0459bc Feature: Add Open Graph meta tags for social sharing
ce841c6 Feature: Add share button to top bar for non-logged-in users
d6241dc UI: Update button text and signup prompt wording
7cada58 UI: Improve signup prompt layout and benefit alignment
b8c625c UI: Make share button icon-only for compact bottom nav
8f02bcb Feature: Add app share button to bottom navigation
e7c55a1 Fix: Improve app stability when resuming from background
a1fd938 Refactor: Use manual PWA setup instead of vite-plugin-pwa
```
