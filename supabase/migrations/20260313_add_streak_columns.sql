-- 스트릭(연속 기도) 관련 컬럼 추가
-- profiles 테이블에 스트릭 추적을 위한 컬럼 추가

-- 1. current_streak: 현재 연속 기도 일수
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- 2. longest_streak: 최장 연속 기도 일수
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 3. total_prayer_days: 총 기도한 날 수 (기존 total_prayers_generated와 다름)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_prayer_days INTEGER DEFAULT 0;

-- 4. birth_date: 생년월일 (회원가입 시 중복 체크용)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 5. full_name: 전체 이름 (중복 체크용)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_name_birth ON profiles(full_name, birth_date);

-- 기존 데이터가 있는 경우, last_prayer_date 기반으로 초기화
-- 어제나 오늘 기도한 경우 스트릭 1로 설정
UPDATE profiles
SET
  current_streak = CASE
    WHEN last_prayer_date = CURRENT_DATE THEN 1
    WHEN last_prayer_date = CURRENT_DATE - 1 THEN 1
    ELSE 0
  END,
  total_prayer_days = CASE
    WHEN total_prayers_generated > 0 THEN 1
    ELSE 0
  END,
  longest_streak = CASE
    WHEN last_prayer_date = CURRENT_DATE OR last_prayer_date = CURRENT_DATE - 1 THEN 1
    ELSE 0
  END
WHERE current_streak IS NULL OR current_streak = 0;

-- handle_new_user 함수 업데이트 (새 사용자 프로필 생성 시 스트릭 초기화)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    full_name,
    birth_date,
    current_streak,
    longest_streak,
    total_prayer_days
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'birth_date')::DATE,
    0,
    0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN profiles.current_streak IS '현재 연속 기도 일수';
COMMENT ON COLUMN profiles.longest_streak IS '최장 연속 기도 기록';
COMMENT ON COLUMN profiles.total_prayer_days IS '총 기도한 날 수';
