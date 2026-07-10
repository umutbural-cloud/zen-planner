-- Schedule final daily admin engagement snapshots after the Istanbul day has closed.
-- This intentionally calls the internal compute function because cron has no auth.uid() context.

DO $$
DECLARE
  existing_job record;
  expected_job_name text := 'admin-engagement-daily-final';
  expected_schedule text := '10 3 * * *';
  expected_command text := 'SELECT public.compute_engagement_snapshot_internal();';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron extension is not installed';
  END IF;

  IF to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'cron.job is not available';
  END IF;

  IF to_regprocedure('public.compute_engagement_snapshot_internal(date, text, uuid)') IS NULL THEN
    RAISE EXCEPTION 'compute_engagement_snapshot_internal is missing';
  END IF;

  SELECT jobid, jobname, schedule, command
  INTO existing_job
  FROM cron.job
  WHERE jobname = expected_job_name
  LIMIT 1;

  IF FOUND THEN
    IF existing_job.schedule = expected_schedule
       AND existing_job.command = expected_command THEN
      RAISE NOTICE 'admin-engagement-daily-final cron job already exists with expected schedule and command';
    ELSE
      RAISE EXCEPTION 'admin-engagement-daily-final cron job already exists with different schedule or command';
    END IF;
  ELSE
    PERFORM cron.schedule(
      expected_job_name,
      expected_schedule,
      expected_command
    );
  END IF;
END;
$$;
