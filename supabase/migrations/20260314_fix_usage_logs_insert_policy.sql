-- usage_logs INSERT 정책 추가
-- 기존에 INSERT 정책이 없어서 사용량 로깅이 되지 않는 문제 수정

-- 로그인 사용자 INSERT 정책
CREATE POLICY IF NOT EXISTS "Users can insert own usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 익명 사용자 INSERT 정책 (anonymous_id 사용 시)
CREATE POLICY IF NOT EXISTS "Anonymous users can insert usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);
