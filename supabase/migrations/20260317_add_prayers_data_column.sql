-- Add prayers_data column to store multiple prayers as JSON
ALTER TABLE todays_prayer_sessions
ADD COLUMN IF NOT EXISTS prayers_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN todays_prayer_sessions.prayers_data IS 'JSON array of multiple prayers for the day';
