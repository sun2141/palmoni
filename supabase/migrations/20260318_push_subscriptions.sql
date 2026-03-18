-- FCM 푸시 구독 정보 저장 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, fcm_token)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- RLS 정책
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 구독 정보만 조회 가능
CREATE POLICY "Users can view own push subscriptions"
    ON push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자가 자신의 구독 정보 추가 가능
CREATE POLICY "Users can insert own push subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 구독 정보 수정 가능
CREATE POLICY "Users can update own push subscriptions"
    ON push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- 사용자가 자신의 구독 정보 삭제 가능
CREATE POLICY "Users can delete own push subscriptions"
    ON push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- 서비스 역할이 모든 구독 정보 조회 가능 (Cron job용)
-- 이 정책은 서버사이드에서 service_role 키로 접근할 때 사용됨
