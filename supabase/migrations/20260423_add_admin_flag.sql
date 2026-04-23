-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = true;

-- Admin stats view: accessible only via service_role (used by serverless functions)
-- This view does NOT have RLS so it's protected at the API layer

COMMENT ON COLUMN profiles.is_admin IS 'Whether the user has admin privileges';

-- RLS: Ensure profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Users can only read their own profile (including is_admin field)
-- This prevents a regular user from querying another user's is_admin value directly
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS POLICY: Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS POLICY: Service role bypasses RLS (for admin serverless functions)
-- Note: service_role key automatically bypasses RLS in Supabase
