-- 오늘의 기도 세션 테이블 (localStorage 백업용)
-- 사용자의 오늘의 기도 상태를 서버에 백업하여 localStorage 손실 시 복구 가능

CREATE TABLE IF NOT EXISTS todays_prayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 기도 정보
  prayer_topic TEXT,
  prayer_title TEXT,
  prayer_content TEXT,
  prayer_emotion VARCHAR(50) DEFAULT 'peace',

  -- 기도 시간 배열 (JSON array of ISO timestamps)
  prayer_times JSONB DEFAULT '[]'::jsonb,

  -- 현재 진행 상태
  current_index INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'idle', -- idle, praying, completed, yesterday_completed

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 하루에 한 세션만 허용
  UNIQUE(user_id, session_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_todays_prayer_sessions_user_date
  ON todays_prayer_sessions(user_id, session_date);

CREATE INDEX IF NOT EXISTS idx_todays_prayer_sessions_date
  ON todays_prayer_sessions(session_date);

-- RLS 정책
ALTER TABLE todays_prayer_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 조회/수정 가능
CREATE POLICY "Users can view own prayer sessions"
  ON todays_prayer_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prayer sessions"
  ON todays_prayer_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prayer sessions"
  ON todays_prayer_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prayer sessions"
  ON todays_prayer_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7일 지난 세션 자동 삭제 (선택적)
-- CREATE OR REPLACE FUNCTION cleanup_old_prayer_sessions()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM todays_prayer_sessions
--   WHERE session_date < CURRENT_DATE - INTERVAL '7 days';
-- END;
-- $$ LANGUAGE plpgsql;
