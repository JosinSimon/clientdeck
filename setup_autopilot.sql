-- 1. ADD THE MISSING COLUMN
ALTER TABLE autopilot_configs ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- 2. SET UP THE CRON JOB TO FIRE THE EDGE FUNCTION EVERY MINUTE
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('invoke-autopilot-generator');

SELECT cron.schedule(
    'invoke-autopilot-generator',
    '* * * * *',
    $$
    SELECT net.http_post(
        url:='https://jzjnksydcmlbvazurezl.supabase.co/functions/v1/autopilot-report-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6am5rc3lkY21sYnZhenVyZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTU1OTEsImV4cCI6MjA4OTU5MTU5MX0.I3j5qGR5JU4uWm2itGXnHvALtviRh6ug06o4zR_1FgY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
    $$
);
