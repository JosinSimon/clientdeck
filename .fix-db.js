import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:wdijRBV8Grk2Qn8x@db.jzjnksydcmlbvazurezl.supabase.co:5432/postgres'
});

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6am5rc3lkY21sYnZhenVyZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTU1OTEsImV4cCI6MjA4OTU5MTU5MX0.I3j5qGR5JU4uWm2itGXnHvALtviRh6ug06o4zR_1FgY';

async function run() {
  await client.connect();
  
  console.log("Adding next_run_at column...");
  try {
    await client.query('ALTER TABLE autopilot_configs ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;');
    console.log("Column added or already exists.");
  } catch (e) {
    console.error("Failed to add column:", e.message);
  }

  console.log("Attempting to set up pg_cron to invoke autopilot generator every minute...");
  try {
    const setupCronSql = `
      CREATE EXTENSION IF NOT EXISTS pg_net;
      
      SELECT cron.unschedule('invoke-autopilot-generator');

      SELECT cron.schedule(
          'invoke-autopilot-generator',
          '* * * * *',
          $$
          SELECT net.http_post(
              url:='https://jzjnksydcmlbvazurezl.supabase.co/functions/v1/autopilot-report-generator',
              headers:=format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', '${anonKey}')::jsonb,
              body:='{}'::jsonb
          ) as request_id;
          $$
      );
    `;
    await client.query(setupCronSql);
    console.log("Cron job set up successfully.");
  } catch (e) {
    console.error("Failed to set up cron job:", e.message);
  }

  await client.end();
}
run();
