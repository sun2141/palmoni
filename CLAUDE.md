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
