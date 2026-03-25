import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:wdijRBV8Grk2Qn8x@db.jzjnksydcmlbvazurezl.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  
  console.log("--- 1. AUTOPILOT CONFIGS TABLE ---");
  try {
    const res1 = await client.query('SELECT * FROM autopilot_configs;');
    console.log(res1.rows);
  } catch (e) {
    console.error(e.message);
  }

  console.log("\\n--- 2. CRON JOBS ---");
  try {
    const res2 = await client.query('SELECT jobid, schedule, command, jobname FROM cron.job;');
    console.log(res2.rows);
  } catch (e) {
    console.error("Cron jobs table inaccessible or empty:", e.message);
  }

  console.log("\\n--- 3. CRON EXECUTIONS (LAST 5) ---");
  try {
    const res3 = await client.query('SELECT runid, jobid, status, start_time, end_time, return_message FROM cron.job_run_details ORDER BY runid DESC LIMIT 5;');
    console.log(res3.rows);
  } catch (e) {
    console.error("Executions log inaccessible or empty:", e.message);
  }

  await client.end();
}
run();
