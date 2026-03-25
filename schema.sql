-- ============================================================
-- ClientDeck — Supabase Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'Lead',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Not Started',
  budget NUMERIC DEFAULT 0,
  deadline TEXT DEFAULT '',
  progress INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'To Do',
  due_date TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  date TEXT DEFAULT '',
  due TEXT DEFAULT '',
  line_items JSONB DEFAULT '[]'::jsonb,
  tax NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  recurring TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own invoices" ON invoices
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. PROPOSALS
CREATE TABLE IF NOT EXISTS proposals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  date TEXT DEFAULT '',
  introduction TEXT DEFAULT '',
  deliverables JSONB DEFAULT '[]'::jsonb,
  timeline TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  scope_of_work TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own proposals" ON proposals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  task TEXT DEFAULT '',
  duration INT DEFAULT 0,
  date TEXT DEFAULT '',
  status TEXT DEFAULT 'Unbilled',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own time_entries" ON time_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  month TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft',
  ai_summary TEXT DEFAULT '',
  content TEXT DEFAULT '',
  raw_data TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reports" ON reports
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. REMINDERS
CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  date TEXT DEFAULT '',
  type TEXT DEFAULT 'task',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. PORTALS
CREATE TABLE IF NOT EXISTS portals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  url TEXT DEFAULT '',
  last_accessed TEXT DEFAULT 'Never',
  status TEXT DEFAULT 'Active',
  permissions JSONB DEFAULT '{"invoices":true,"projects":false,"reports":false,"files":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own portals" ON portals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. CLIENT FILES (metadata — actual files in Supabase Storage)
CREATE TABLE IF NOT EXISTS client_files (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  uploader TEXT DEFAULT 'Agency',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own client_files" ON client_files
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11. AUTOPILOT CONFIGS
CREATE TABLE IF NOT EXISTS autopilot_configs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  cadence TEXT DEFAULT '1st of Month',
  next_run_at TIMESTAMPTZ,
  report_id BIGINT REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE autopilot_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own autopilot_configs" ON autopilot_configs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT '',
  email TEXT NOT NULL,
  role TEXT DEFAULT 'Editor',
  status TEXT DEFAULT 'Invited',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own team_members" ON team_members
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 13. USER SETTINGS
CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile JSONB DEFAULT '{"name":"","email":"","avatar":null}'::jsonb,
  business JSONB DEFAULT '{"name":"","currency":"USD ($)"}'::jsonb,
  branding JSONB DEFAULT '{"color":"#2563eb","domain":"","logo":null}'::jsonb,
  integrations JSONB DEFAULT '{"stripe":false,"slack":false,"analytics":false,"meta":false}'::jsonb,
  notification_prefs JSONB DEFAULT '{"invoicePaid":true,"portalViewed":true,"proposalSigned":true,"dailyDigest":false,"marketingEmails":false}'::jsonb,
  billing_history JSONB DEFAULT '[]'::jsonb,
  is_2fa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own user_settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE POLICIES (for the 'client-files' bucket)
-- Create the bucket first in Dashboard → Storage → New Bucket
-- Name: client-files, Private: true
-- Then run these policies:
-- ============================================================

CREATE POLICY "Users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
