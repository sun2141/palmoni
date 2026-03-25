-- ============================================================
-- Prayer Loop System Tables
-- Migration: 20260325_prayer_loops.sql
-- ============================================================

-- 1. prayer_loops: 기도 여정 마스터
CREATE TABLE IF NOT EXISTS prayer_loops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- 기도 정보
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    initial_emotion TEXT NOT NULL CHECK (initial_emotion IN ('peace', 'gratitude', 'repentance', 'hope', 'sadness')),
    current_emotion TEXT NOT NULL CHECK (current_emotion IN ('peace', 'gratitude', 'repentance', 'hope', 'sadness')),

    -- 설정
    continue_prayer BOOLEAN DEFAULT true,

    -- 상태
    status TEXT DEFAULT 'active' NOT NULL
        CHECK (status IN ('active', 'checkin_due', 'continued', 'completed', 'snoozed')),

    -- 기간 추적
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_session_date DATE,
    total_days INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. prayer_sessions: 일별 세션
CREATE TABLE IF NOT EXISTS prayer_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loop_id UUID REFERENCES prayer_loops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- 세션 정보
    session_date DATE NOT NULL,
    day_number INTEGER NOT NULL,
    emotion TEXT NOT NULL CHECK (emotion IN ('peace', 'gratitude', 'repentance', 'hope', 'sadness')),

    -- 기도문 (생성됨)
    prayer_title TEXT,
    prayer_content TEXT,
    prayer_generated_at TIMESTAMPTZ,

    -- 완료 추적
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'prayed', 'checkin_due', 'completed', 'skipped')),
    prayed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- 하루 기도 횟수
    prayer_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(loop_id, session_date)
);

-- 3. prayer_checkins: 체크인 응답
CREATE TABLE IF NOT EXISTS prayer_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loop_id UUID REFERENCES prayer_loops(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES prayer_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- 체크인 응답
    response_type TEXT NOT NULL
        CHECK (response_type IN ('continue', 'change_emotion', 'complete', 'snooze')),

    -- 감정 변경 시
    next_emotion TEXT CHECK (next_emotion IN ('peace', 'gratitude', 'repentance', 'hope', 'sadness')),

    -- 메모 (선택)
    note TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prayer_loops_user ON prayer_loops(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_loops_user_status ON prayer_loops(user_id, status);
CREATE INDEX IF NOT EXISTS idx_prayer_loops_active ON prayer_loops(user_id, status)
    WHERE status IN ('active', 'checkin_due', 'continued');

CREATE INDEX IF NOT EXISTS idx_prayer_sessions_loop ON prayer_sessions(loop_id);
CREATE INDEX IF NOT EXISTS idx_prayer_sessions_date ON prayer_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_prayer_sessions_pending ON prayer_sessions(loop_id, status)
    WHERE status IN ('pending', 'checkin_due');

CREATE INDEX IF NOT EXISTS idx_prayer_checkins_loop ON prayer_checkins(loop_id);
CREATE INDEX IF NOT EXISTS idx_prayer_checkins_session ON prayer_checkins(session_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE prayer_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_checkins ENABLE ROW LEVEL SECURITY;

-- prayer_loops RLS
DROP POLICY IF EXISTS "Users manage own loops" ON prayer_loops;
CREATE POLICY "Users manage own loops"
    ON prayer_loops FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- prayer_sessions RLS
DROP POLICY IF EXISTS "Users manage own sessions" ON prayer_sessions;
CREATE POLICY "Users manage own sessions"
    ON prayer_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- prayer_checkins RLS
DROP POLICY IF EXISTS "Users manage own checkins" ON prayer_checkins;
CREATE POLICY "Users manage own checkins"
    ON prayer_checkins FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prayer_loops_updated ON prayer_loops;
CREATE TRIGGER trg_prayer_loops_updated
    BEFORE UPDATE ON prayer_loops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prayer_sessions_updated ON prayer_sessions;
CREATE TRIGGER trg_prayer_sessions_updated
    BEFORE UPDATE ON prayer_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
