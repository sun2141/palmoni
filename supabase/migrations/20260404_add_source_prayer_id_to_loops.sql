-- ============================================================
-- Add source_prayer_id to prayer_loops
-- Migration: 20260404_add_source_prayer_id_to_loops.sql
-- 기도문에서 매일 기도 전환 시 원본 기도문 ID 추적용
-- ============================================================

ALTER TABLE prayer_loops
ADD COLUMN IF NOT EXISTS source_prayer_id UUID REFERENCES prayers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prayer_loops_source_prayer ON prayer_loops(source_prayer_id)
    WHERE source_prayer_id IS NOT NULL;
