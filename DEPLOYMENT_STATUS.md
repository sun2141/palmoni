# Palmoni 배포 상태

## 현재 상태

**마지막 업데이트**: 2026-04-13
**배포 플랫폼**: Vercel
**프로덕션 URL**: https://palmoni.vercel.app
**상태**: 🟢 배포 준비 완료

---

## 최근 배포 내역

| 날짜 | 커밋 | 내용 |
|------|------|------|
| 2026-04-13 | c90c9d5 | Style: CSS 전체 개편 및 UI 개선 |
| 2026-04-09 | 0b776d1 | Fix: 매일 기도 일수가 1일에서 증가하지 않는 버그 수정 |
| 2026-04-05 | 90b7302 | Fix: KST 자정 기준 날짜 리셋 버그 수정 |
| 2026-03-31 | d484e23 | Fix: 세션 로딩, 상태 전이, 기도 에러 처리 |

---

## 기술 스택

### 프론트엔드
```
React 18 + Vite
CSS (커스텀)
PWA (서비스 워커)
```

### 백엔드
```
Vercel Serverless Functions
Supabase (Auth + PostgreSQL)
Google Gemini 2.5 Flash (AI 기도문 생성)
```

### API 엔드포인트
```
POST /api/generate-prayer        # 기도문 생성 (Gemini)
POST /api/generate-prayer-stream # 스트리밍 기도문 생성
```

---

## 빌드 정보

### 번들 크기 (마지막 빌드 기준)
```
JavaScript: ~462 KB (gzipped ~141 KB)
CSS:         ~18 KB (gzipped ~4 KB)
```

### 빌드 명령어
```bash
npm run build    # 프로덕션 빌드
vercel --prod    # Vercel 프로덕션 배포
```

---

## 환경 변수 (설정 완료)

```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ GOOGLE_API_KEY
```

---

## 데이터베이스 스키마 (Supabase)

### 테이블
```sql
✅ profiles          -- 사용자 프로필
✅ prayers           -- 저장된 기도문
✅ prayer_loops      -- 매일 기도 여정 (source_prayer_id 포함)
✅ prayer_sessions   -- 일별 세션 (기도문 포함)
✅ prayer_checkins   -- 체크인 응답
✅ usage_logs        -- API 사용량 (Rate limiting)
```

### 최근 마이그레이션
```
20260404_add_source_prayer_id_to_loops.sql  # source_prayer_id 컬럼 추가
```

---

## 주요 기능 상태

- [x] 빠른 기도 (Quick Prayer) - AI 기도문 생성
- [x] 매일 기도 (Daily Loop) - 상태 머신 기반 기도 여정
- [x] 기도 공유 - 이미지 생성 (5가지 테마) + 카카오톡 공유
- [x] 구글 로그인 (Supabase Auth)
- [x] PWA 지원
- [x] KST 기준 날짜 처리
- [x] API Rate Limiting

---

## 알려진 이슈

- 없음 (2026-04-13 기준)

---

**다음 배포 예정**: PROGRESS.md 업데이트 반영
