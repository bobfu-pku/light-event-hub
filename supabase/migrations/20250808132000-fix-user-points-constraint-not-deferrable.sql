-- Fix ON CONFLICT error by making the unique constraint non-deferrable
-- Context: INSERT ... ON CONFLICT cannot target deferrable unique constraints/exclusion constraints
-- We drop the old DEFERRABLE constraint and recreate it as NOT DEFERRABLE

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_participation_per_event'
      AND conrelid = 'public.user_points'::regclass
  ) THEN
    ALTER TABLE public.user_points
      DROP CONSTRAINT unique_participation_per_event;
  END IF;
END $$;

-- Recreate as NOT DEFERRABLE so it can be used as an arbiter for ON CONFLICT
ALTER TABLE public.user_points
  ADD CONSTRAINT unique_participation_per_event
  UNIQUE NULLS NOT DISTINCT (user_id, event_id, kind);

COMMIT;


