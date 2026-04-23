# Palmoni 프로젝트 진행 상황

> 마지막 업데이트: 2026-04-23

## 프로젝트 개요

**Palmoni** - "누군가 당신과 함께 기도합니다"

기독교 기도 앱으로, 사용자가 기도 제목을 입력하면 AI가 기도문을 생성하고, 함께 기도하는 경험을 제공합니다.

### 기술 스택
- **Frontend**: React 18 + Vite, CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (Auth + PostgreSQL)
- **AI**: Google Gemini 2.5 Flash (기도문 생성)
- **Deployment**: Vercel (palmoni.vercel.app)

---

## 주요 기능

### 1. 빠른 기도 (Quick Prayer)
- 기도 제목 입력 → AI 기도문 생성 → 함께 기도하기
- 감정 선택 (평화, 감사, 회개, 소망, 위로)
- 기도문 저장, 복사, 공유

### 2. 매일 기도 (Daily Loop) ⭐ 핵심 기능
매일 이어지는 기도 여정 시스템

#### 상태 머신
```
active ──(기도 완료)──> checkin_due

checkin_due ──(계속)───> continued ──(다음날)──> active
            ──(감정변경)─> continued
            ──(완료)───> completed
            ──(일시중지)─> snoozed

snoozed ──(다시 시작)──> active
```

#### 페이지 구조
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/loop/new` | LoopCreate.jsx | 새 매일 기도 생성 |
| `/loop/:loopId` | LoopDetail.jsx | 오늘의 기도 진행 |
| `/loop/history` | LoopHistory.jsx | 기도 기록 목록 |

#### DB 테이블
- `prayer_loops`: 기도 여정 마스터
- `prayer_sessions`: 일별 세션 (기도문 포함)
- `prayer_checkins`: 체크인 응답

### 3. 기도 공유
- **이미지 공유**: 기도문을 이미지로 생성하여 공유 (5가지 테마)
- **기도 부탁하기**: 친구에게 기도 요청 공유 (카카오톡 등)

### 4. 기타
- PWA 지원 (오프라인, 홈 화면 추가)
- 구글 로그인 (Supabase Auth)
- Open Graph 메타 태그

---

## 최근 작업 내역 (2026-04-23)

### 완료된 작업

#### 관리자 페이지 접속 불가 문제 수정 (3차)

- **문제**: `/admin` 페이지 접속은 되나 API 호출 시 CORS 오류로 데이터 불러오기 실패
- **원인 분석**:
  - `api/lib/cors.js`의 `Access-Control-Allow-Headers`에 `Authorization` 헤더 누락
  - admin API는 `Authorization: Bearer <token>` 헤더를 사용하는데, CORS preflight(OPTIONS)에서 이 헤더를 허용하지 않아 차단
  - `api/admin/_auth.js`의 환경변수 미설정 에러 메시지가 불명확 → 디버깅 어려움
- **해결**:
  - `api/lib/cors.js`: `Access-Control-Allow-Headers`에 `Authorization` 추가
  - `api/admin/_auth.js`: 환경변수 미설정 시 누락된 변수명 명시 (디버깅 용이)
- **파일**: `api/lib/cors.js`, `api/admin/_auth.js`

> **Vercel 배포 환경변수 확인 필수**: Vercel 대시보드에서 아래 환경변수가 설정되어 있어야 함
> - `VITE_SUPABASE_URL` (또는 `SUPABASE_URL`)
> - `SUPABASE_SERVICE_ROLE_KEY`
> 미설정 시 admin API가 "Server misconfiguration" 오류 반환

#### 관리자 페이지 접속 불가 문제 수정 (2차)

- **문제**: `/admin` 페이지 접속 시 무한 로딩 스피너 또는 즉시 홈으로 리다이렉트
- **원인 분석**:
  - `Admin.jsx`의 로딩 게이트 조건이 `authLoading`에 의존 → `authLoading=true`인 동안 무한 스피너
  - `authLoading`은 프로필 로딩이 완료될 때까지 `true`이지만, useEffect는 `authLoading=false`를 기다림
  - 결국 `isInitialized=true`, `authLoading=true` 상태에서 화면은 스피너를 표시하고, useEffect는 실행을 건너뜀 → 정상 진행 불가
  - `accessChecked` 상태 변수 불필요한 복잡성 추가
- **해결**:
  - `authLoading` 의존성 제거, `isInitialized`만으로 로딩 게이트 처리
  - `accessChecked`/`hasAccess` 상태 변수 제거 → `profile.is_admin`을 직접 렌더링 조건으로 사용
  - 로딩 조건: `!isInitialized || (user && profile === undefined)`
  - 접근 차단: `!user || profile?.is_admin !== true` 이면 `null` 반환
  - `PrayersTab`의 React Fragment에 key 누락 버그도 함께 수정
- **파일**: `src/pages/Admin.jsx`

---

## 최근 작업 내역 (2026-04-17)

### 완료된 작업

#### 배포 캐시 문제 진단 및 해결
- **문제**: CSS 디자인 변경이 배포 후 palmoni.vercel.app에서 보이지 않음
- **원인 1**: `index.html` 인라인 캐시 정리 스크립트가 `palmoni-v6`을 유지하도록 하드코딩 → 실제 sw.js는 `palmoni-v8`이어서 구 버전 캐시가 계속 남음
- **원인 2**: Vercel에서 `sw.js`, `manifest.json`, HTML에 HTTP 캐시 헤더 미설정 → CDN/브라우저가 구버전 서비스 워커를 캐시
- **해결**:
  - `sw.js`: `CACHE_NAME` `palmoni-v8` → `palmoni-v9` (버전 올려 강제 재설치)
  - `index.html`: 인라인 캐시 정리 조건 `palmoni-v6` → `palmoni-v9`로 동기화
  - `vercel.json`: HTTP 캐시 헤더 추가
    - `sw.js`, `manifest.json`, HTML: `no-cache, no-store, must-revalidate`
    - `/assets/*` (Vite 해시 파일): `public, max-age=31536000, immutable`
- **파일**: `public/sw.js`, `index.html`, `vercel.json`

#### CSS 디자인 시스템 개선
- **index.css 디자인 토큰 추가**:
  - `--color-primary-hover: #5a3de8` (버튼 hover 색상)
  - `--border-medium: rgba(108, 71, 255, 0.18)`, `--border-strong: rgba(108, 71, 255, 0.3)` (테두리 강도)
  - `--shadow-card`, `--shadow-card-hover`, `--shadow-modal` (컴포넌트별 그림자)
  - `--radius-2xl: 24px` (모달용 큰 반경)
  - `--gradient-primary: linear-gradient(135deg, #6C47FF 0%, #8B6FFF 100%)` (프라이머리 그라디언트)
- **애니메이션 타이밍 최적화**: `--duration-base` 300ms → 250ms
- **컴포넌트 CSS 일관성 통일**: 모든 컴포넌트에서 `var(--shadow-card)`, `var(--border-soft)`, `var(--border-medium)` 등 디자인 토큰 사용
- **모달 개선**: `box-shadow: var(--shadow-modal)` 적용 (LoginModal, PrayTogetherModal, MyPrayers)
- **파일**: `src/index.css`, `src/components/auth/LoginModal.css`, `src/components/loop/CheckinBottomSheet.css`, `src/components/loop/LoopCard.css`, `src/components/loop/LoopEditModal.css`, `src/components/prayer/PrayTogetherModal.css`, `src/pages/Home.css`, `src/pages/MyPrayers.css`, `src/pages/Pricing.css`, `src/pages/loop/LoopCreate.css`, `src/pages/loop/LoopDetail.css`, `src/pages/loop/LoopHistory.css`

---

## 최근 작업 내역 (2026-04-09)

### 완료된 작업

#### 1. 매일 기도 일수 1일에서 증가하지 않는 버그 수정
- **문제**: 매일 기도(Loop)의 "N일째" 카운트가 2일차부터 증가하지 않고 계속 1일 유지
- **원인**: `useSession.js`의 1일차 세션 누락 처리 조건 버그
  - `if (loopData.total_days === 1)` 조건이 Day 1 세션 누락 케이스 전용인데, Day 2 진입 시에도 `total_days === 1` 이므로 잘못 실행됨
  - 2일차에 새 세션을 만들어야 할 때 1일차 세션을 생성하고 return → `total_days` 업데이트 없음
- **해결**: 조건에 `loopData.last_session_date === today` 추가
  - `total_days === 1 && last_session_date === today` : 오늘 생성된 루프의 1일차 세션 누락 → 1일차 세션 생성
  - `total_days === 1 && last_session_date !== today` : 새로운 날 → 2일차 세션 생성 및 `total_days` 증가
- **파일**: `src/hooks/useSession.js`

---

## 최근 작업 내역 (2026-04-05)

### 완료된 작업

#### 2. KST 자정 기준 날짜 리셋 버그 수정
- **문제**: 자정이 지나도 기도 남은 횟수가 리셋되지 않음 (09:00 KST에 리셋됨)
- **원인**: 모든 날짜 계산이 `new Date().toISOString().split('T')[0]`(UTC 날짜) 사용
  - `checkRateLimit` 쿼리: `.gte('created_at', `${today}T00:00:00Z`)` → UTC 자정 기준
  - 한국 시간 자정(00:00 KST) = UTC 전날 15:00 → 어제 기도가 오늘 사용분으로 계속 잡힘
- **해결**:
  - `getTodayKST()` / `getYesterdayKST()` 헬퍼 함수 추가 (`Intl.DateTimeFormat` Asia/Seoul)
  - `checkRateLimit` 쿼리 boundary: `T00:00:00Z` → `T00:00:00+09:00` (KST 자정 기준)
  - 전체 날짜 사용 함수 KST로 통일: `checkRateLimit`, `updateStreak`, `getTodayPrayerSlots`, `createLoop`, `createSession`, `getTodaysLoopSession`, `saveTodaysPrayerSession`, `getTodaysPrayerSession`
  - `useSession.js`, `useLoop.js`의 날짜 비교도 KST로 통일
- **파일**: `src/lib/supabaseClient.js`, `src/hooks/useSession.js`, `src/hooks/useLoop.js`

#### 1. 매일 기도 전환 버튼 중복 표시 버그 수정
- **문제**: 이미 매일 기도로 등록된 기도문에도 "매일 기도로 전환" 버튼이 계속 표시됨
- **원인**: `convertedPrayerIds`가 인메모리 상태여서 페이지 이동 시 초기화됨. `prayer_loops` 테이블에 원본 기도문 ID 추적 컬럼 없음
- **해결**:
  - `prayer_loops` 테이블에 `source_prayer_id` 컬럼 추가 (마이그레이션 완료)
  - `createLoop` API에 `sourcePrayerId` 파라미터 추가
  - `createLoopFromPrayer`에서 `prayer.id`를 `source_prayer_id`로 저장
  - `useLoop`에서 `prayerIdsInLoop` Set 노출 (활성 루프의 source_prayer_id 목록)
  - `MyPrayers`의 버튼 조건에 `!prayerIdsInLoop.has(prayer.id)` 추가
- **파일**: `supabase/migrations/20260404_add_source_prayer_id_to_loops.sql`, `src/lib/supabaseClient.js`, `src/hooks/useLoop.js`, `src/pages/MyPrayers.jsx`

---

## 최근 작업 내역 (2026-03-31)

### 완료된 작업

#### 1. 체크인 플로우 수정
- **문제**: 기도 완료 후 체크인 모달이 나타나지 않음
- **원인**: `isCheckinDue`가 저녁 6시 이후에만 true
- **해결**: 기도 완료 후 시간 관계없이 항상 체크인 옵션 제공
- **파일**: `src/pages/loop/LoopDetail.jsx`

#### 2. 기도문 제목에서 일차 표시 제거
- **문제**: "1일차 평안의 기도" 같은 제목이 3일째에도 표시
- **해결**:
  - API 프롬프트 수정 (일차 포함하지 않도록)
  - `cleanPrayerTitle()` 함수로 기존 제목 필터링
- **파일**: `api/generate-prayer.js`, `src/pages/loop/LoopDetail.jsx`

#### 3. 일시중지된 기도 다시 시작 기능
- **추가**: LoopCard에 "다시 시작" 버튼 (녹색)
- **추가**: LoopHistory에 "일시중지" 필터 탭
- **파일**: `src/components/loop/LoopCard.jsx`, `src/pages/loop/LoopHistory.jsx`

#### 4. 세션 중복 생성 버그 수정 ⚠️ 중요
- **문제**: 같은 기도가 2개 생성됨
- **원인**:
  - `createLoop`에서 첫 세션 생성 → `useSession`에서 또 생성
  - `resumeLoop`에서 세션 생성 → `useSession`에서 또 생성
- **해결**:
  - `createSession`에 중복 체크 추가
  - `createLoop`에 `last_session_date` 설정
  - `useSession`에서 Day 1은 건너뛰기
  - `resumeLoop`에서 total_days 한 번만 증가
- **파일**: `src/lib/supabaseClient.js`, `src/hooks/useLoop.js`, `src/hooks/useSession.js`

#### 5. 완료된 기도 정렬 및 삭제 기능
- **추가**: 전체 보기에서 완료된 기도는 아래로 정렬
- **추가**: 완료/일시중지 상태에 삭제 버튼
- **추가**: `deleteLoop` API 함수 (관련 세션, 체크인도 삭제)
- **파일**: `src/lib/supabaseClient.js`, `src/pages/loop/LoopHistory.jsx`, `src/components/loop/LoopCard.jsx`

#### 6. 태그라인 변경
- **변경**: "이름 없는 존재가 당신을 위해 기도합니다" → "누군가 당신과 함께 기도합니다"
- **파일**: `index.html`, `manifest.json`, `Home.jsx`, `MyPrayers.jsx`, `PrayerImageShare.jsx`

---

## 파일 구조 (주요 파일)

```
palmoni/
├── api/
│   ├── generate-prayer.js      # 기도문 생성 API (Gemini)
│   └── generate-prayer-stream.js
├── src/
│   ├── components/
│   │   ├── loop/
│   │   │   ├── CheckinBottomSheet.jsx  # 체크인 모달
│   │   │   ├── CheckinResult.jsx       # 체크인 결과
│   │   │   ├── EmotionSelector.jsx     # 감정 선택기
│   │   │   ├── LoopCard.jsx            # 히스토리 카드
│   │   │   └── LoopStatusBadge.jsx     # 상태 배지
│   │   ├── prayer/
│   │   │   └── PrayTogetherModal.jsx   # 함께 기도하기 모달
│   │   └── share/
│   │       ├── PrayerImageShare.jsx    # 이미지 공유
│   │       └── AskPrayerShare.jsx      # 기도 부탁 공유
│   ├── hooks/
│   │   ├── useLoop.js           # 루프 CRUD + 상태 관리
│   │   ├── useSession.js        # 일별 세션 관리
│   │   └── useCheckin.js        # 체크인 로직
│   ├── pages/
│   │   ├── loop/
│   │   │   ├── LoopCreate.jsx   # 매일 기도 생성
│   │   │   ├── LoopDetail.jsx   # 기도 진행 화면
│   │   │   └── LoopHistory.jsx  # 기록 목록
│   │   ├── Home.jsx
│   │   └── MyPrayers.jsx        # 내 기도문 목록
│   └── lib/
│       └── supabaseClient.js    # DB 함수들
├── public/
│   ├── manifest.json
│   └── sw.js                    # 서비스 워커
└── supabase/
    └── migrations/              # DB 스키마
```

---

## 알려진 이슈 / TODO

### 현재 이슈
- 없음 (테스트 필요)

> 참고: 2026-04-04 이전에 생성된 매일 기도는 `source_prayer_id`가 없어 기존 기도문에는 버튼이 계속 표시될 수 있음. 신규 등록분부터 정상 동작.

### 향후 개선 사항
1. **타임라인 뷰** (`/loop/:id/timeline`) - 기도 여정 시각화
2. **푸시 알림** - 기도 시간 알림
3. **예약 기도** - 특정 시간에 기도 알림
4. **결제 시스템** - 한국 결제 연동 (카카오페이, 토스)
5. **Google Play Store 출시** - TWA로 PWA 래핑

---

## 커밋 히스토리 (최근)

```
ffe1745 feat: 그래서 관리자페이지 주소와 관리자 계정 정보를 알려줘. (task=task_1776953102393_be0557, round=1)
e189052 feat: 관리자 페이지 접속 문제 진단 (task=task_1776951974046_5a9a36, round=1)
5ef7b0c feat: 관리자 페이지 접속 문제 진단 및 수정 (task=task_1776948419081_5b0d16, round=1)
df8b723 feat: 관리자 페이지 접속 불가 문제 진단 및 수정 (task=task_1776946845632_004b59, round=1)
cb6eb34 feat: 관리자 페이지를 만들었는데 주소가 어떻게 되지? (task=task_1776946605690_a8bd7c, round=1)
eb3231e feat: Palmoni 관리자 페이지 구현 (task=task_1776921733440_52fab7, round=2)
4f94314 feat: 배포 상태 및 캐시 문제 진단 (task=task_1776410461401_8185df, round=1)
8ed37fb feat: CSS 개선 작업 커밋 및 마무리 (task=task_1776409286949_18333a, round=3)
70de616 Docs: PROGRESS.md 업데이트
03728bd Style: CSS 디자인 시스템 개선 및 모달 애니메이션 적용
```


---

## 개발 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 미리보기
```

## 환경 변수 (.env.local)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GOOGLE_API_KEY=          # Gemini API
```

---

## 참고 문서

- [CLAUDE.md](./CLAUDE.md) - 프로젝트 지침
- [supabase/migrations/](./supabase/migrations/) - DB 스키마

---

## 다음 세션 시작 시 참고사항

1. 매일 기도 기능의 핵심 흐름:
   - `createLoop` → 첫 세션 자동 생성 (`last_session_date` 설정)
   - `LoopDetail` 진입 → `useSession`이 오늘 세션 로드/생성
   - 기도 시작 → `handleStartPrayer` (원본 기도문 사용)
   - 기도 완료 → `handlePrayComplete` → 체크인 모달
   - 체크인 → `handleCheckinSubmit` → 상태 전이

2. 중복 방지 메커니즘:
   - `createSession`에서 오늘 세션 존재 여부 확인
   - `useSession`에서 Day 1은 건너뜀 (createLoop에서 생성)
   - `loopData.last_session_date === today` 체크

3. 테스트 시 주의:
   - Supabase에서 기존 중복 데이터 정리 필요할 수 있음
   - 브라우저 캐시/서비스 워커 영향 확인
