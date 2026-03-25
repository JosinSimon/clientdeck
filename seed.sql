-- ============================================================
-- ClientDeck — Seed Data (OPTIONAL)
-- Run AFTER creating your account in the app.
-- 
-- INSTRUCTIONS:
-- 1. Sign up in the app
-- 2. Go to Supabase Dashboard → Authentication → Users
-- 3. Copy your user UUID
-- 4. Find-and-replace 'YOUR_USER_ID' below with your UUID
-- 5. Run this in Supabase SQL Editor
-- ============================================================

-- CLIENTS
INSERT INTO clients (user_id, name, contact, email, status, phone, notes) VALUES
  ('YOUR_USER_ID', 'Acme Corp', 'John Doe', 'john@acme.co', 'Active', '(555) 123-4567', 'Great client, always pays on time. Prefers email communication.'),
  ('YOUR_USER_ID', 'Stark Industries', 'Tony S.', 'tony@stark.com', 'Active', '(555) 987-6543', 'High expectations. Needs weekly updates on Fridays.'),
  ('YOUR_USER_ID', 'Globex', 'Hank S.', 'hank@globex.inc', 'Lead', '(555) 456-7890', 'Met at conference. Wants a website redesign next quarter.'),
  ('YOUR_USER_ID', 'Initech', 'Bill L.', 'bill@initech.com', 'Past', '(555) 111-2222', 'Project completed in 2025. Follow up next year.');

-- PROJECTS (client_id references are based on the order of client inserts above)
-- After running the clients insert, check the actual IDs and adjust if needed.
-- Assuming sequential IDs starting from 1:
INSERT INTO projects (user_id, client_id, name, status, budget, deadline, progress) VALUES
  ('YOUR_USER_ID', 1, 'Website Redesign', 'In Progress', 5000, '2026-04-15', 65),
  ('YOUR_USER_ID', 2, 'Mobile App MVP', 'Not Started', 15000, '2026-06-01', 0),
  ('YOUR_USER_ID', 1, 'SEO Audit', 'Completed', 2500, '2026-02-28', 100),
  ('YOUR_USER_ID', 4, 'Legacy System Migration', 'In Review', 8500, '2026-03-10', 90);

-- TASKS
INSERT INTO tasks (user_id, project_id, title, status, due_date, assignee) VALUES
  ('YOUR_USER_ID', 1, 'Design Homepage Mockups', 'Done', '2026-03-20', 'John D.'),
  ('YOUR_USER_ID', 1, 'Setup Database Schema', 'In Review', '', ''),
  ('YOUR_USER_ID', 1, 'Implement Auth API', 'In Progress', '', 'Sarah S.'),
  ('YOUR_USER_ID', 1, 'Write Documentation', 'To Do', '2026-03-25', ''),
  ('YOUR_USER_ID', 2, 'Wireframe User Profile', 'To Do', '', ''),
  ('YOUR_USER_ID', 2, 'Research Competitors', 'To Do', '', '');

-- INVOICES
INSERT INTO invoices (id, user_id, client_id, amount, status, date, due, line_items, tax, notes, recurring) VALUES
  ('#INV-042', 'YOUR_USER_ID', 2, 4500, 'Paid', '2026-03-01', '2026-03-15', '[{"id":1,"description":"Mobile App Design","quantity":1,"unitPrice":4500}]'::jsonb, 0, '', 'none'),
  ('#INV-043', 'YOUR_USER_ID', 1, 2500, 'Pending', '2026-03-05', '2026-03-19', '[{"id":1,"description":"SEO Audit Report","quantity":1,"unitPrice":2500}]'::jsonb, 0, '', 'none'),
  ('#INV-044', 'YOUR_USER_ID', 1, 1200, 'Overdue', '2026-02-15', '2026-03-01', '[{"id":1,"description":"Consulting Hours","quantity":8,"unitPrice":150}]'::jsonb, 0, '', 'none');

-- PROPOSALS
INSERT INTO proposals (user_id, client_id, title, value, status, date, introduction, deliverables, timeline, payment_terms, scope_of_work) VALUES
  ('YOUR_USER_ID', 3, 'Q3 Retainer & Strategy', 3500, 'Sent', '2026-03-10',
    'We are excited to present this proposal for your Q3 marketing strategy.',
    '["Monthly strategy sessions","Content calendar","Analytics reporting"]'::jsonb,
    '3 months starting April 2026', '50% upfront, 50% on completion',
    'Full digital marketing strategy including SEO, content, and paid ads.'),
  ('YOUR_USER_ID', 1, 'Phase 2: E-commerce', 8000, 'Accepted', '2026-03-01',
    'Building on the success of Phase 1, we propose the full e-commerce integration.',
    '["Shopping cart integration","Payment gateway setup","Product catalog migration"]'::jsonb,
    '6 weeks', 'Net 30',
    'End-to-end e-commerce implementation with Stripe and inventory management.'),
  ('YOUR_USER_ID', 2, 'Security Audit', 2000, 'Draft', '2026-03-11',
    '', '[]'::jsonb, '', '', '');

-- TIME ENTRIES
INSERT INTO time_entries (user_id, project_id, task, duration, date, status) VALUES
  ('YOUR_USER_ID', 1, 'UI Wireframing', 120, '2026-03-10', 'Billed'),
  ('YOUR_USER_ID', 1, 'Database Schema Design', 180, '2026-03-11', 'Unbilled');

-- REPORTS
INSERT INTO reports (user_id, client_id, month, status, ai_summary, content, raw_data) VALUES
  ('YOUR_USER_ID', 1, 'March 2026', 'Published',
    'Traffic increased by 8% this month. The new SEO strategy is yielding positive results.',
    E'EXECUTIVE SUMMARY\nThis month saw significant growth across all key metrics. The implementation of Phase 1 of our SEO strategy resulted in an 8% lift in organic traffic.\n\nKEY WINS\n- 8% increase in overall traffic\n- 12% boost in goal completions\n- Reduced bounce rate by 4%\n\nNEXT STEPS\nMoving into April, we will focus on technical SEO cleanup and launching the new blog content cluster.',
    E'Visits: 12,450 (+8%)\nConversions: 234 (+12%)\nBounce: 42% (-4%)'),
  ('YOUR_USER_ID', 2, 'March 2026', 'Draft',
    'Record breaking month. Ad spend ROI is at 3.2x.',
    E'EXECUTIVE SUMMARY\nAd spend efficiency has reached an all-time high of 3.2x ROI. Cost per acquisition dropped by $14.\n\nKEY METRICS\n- Spend: $14,000\n- Revenue Generated: $45,000\n- Conversions: 890\n\nRECOMMENDATION\nScale ad spend on Campaign B by 20% next week to capitalize on current market trends.',
    E'Ad Spend: $14k\nRevenue: $45k\nCPA: $15.70\nConversions: 890');

-- REMINDERS
INSERT INTO reminders (user_id, text, date, type) VALUES
  ('YOUR_USER_ID', 'Follow up with Hank at Globex', 'Today', 'call'),
  ('YOUR_USER_ID', 'Send Q2 proposal to Stark Industries', 'Tomorrow', 'email'),
  ('YOUR_USER_ID', 'Review wireframes for Acme Corp', 'Mar 15', 'task');

-- PORTALS
INSERT INTO portals (user_id, client_id, url, last_accessed, status, permissions) VALUES
  ('YOUR_USER_ID', 1, 'clientdeck.pro/portal/acme-x789', '2 hours ago', 'Active', '{"invoices":true,"projects":true,"reports":false,"files":true}'::jsonb),
  ('YOUR_USER_ID', 2, 'clientdeck.pro/portal/stark-p452', '3 days ago', 'Active', '{"invoices":true,"projects":false,"reports":true,"files":true}'::jsonb);

-- AUTOPILOT CONFIGS
INSERT INTO autopilot_configs (user_id, client_id, enabled, cadence) VALUES
  ('YOUR_USER_ID', 1, true, '1st of Month'),
  ('YOUR_USER_ID', 2, false, 'Last Friday');

-- TEAM MEMBERS
INSERT INTO team_members (user_id, name, email, role, status) VALUES
  ('YOUR_USER_ID', 'John Doe', 'john@clientdeck.pro', 'Owner', 'Active'),
  ('YOUR_USER_ID', 'Sarah Smith', 'sarah@clientdeck.pro', 'Editor', 'Active'),
  ('YOUR_USER_ID', 'Mike Johnson', 'mike@contractor.com', 'Viewer', 'Invited');

-- USER SETTINGS
INSERT INTO user_settings (user_id, profile, business, branding, integrations, notification_prefs, billing_history, is_2fa_enabled) VALUES
  ('YOUR_USER_ID',
    '{"name":"John Doe","email":"john@clientdeck.pro","avatar":null}'::jsonb,
    '{"name":"Freelance Design Co.","currency":"USD ($)"}'::jsonb,
    '{"color":"#2563eb","domain":"freelance-design","logo":null}'::jsonb,
    '{"stripe":true,"slack":false,"analytics":true,"meta":false}'::jsonb,
    '{"invoicePaid":true,"portalViewed":true,"proposalSigned":true,"dailyDigest":false,"marketingEmails":false}'::jsonb,
    '[{"id":"INV-SUB-045","date":"Mar 1, 2026","amount":29,"status":"Paid"},{"id":"INV-SUB-044","date":"Feb 1, 2026","amount":29,"status":"Paid"},{"id":"INV-SUB-043","date":"Jan 1, 2026","amount":29,"status":"Paid"}]'::jsonb,
    false
  );
