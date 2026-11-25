-- Kedgely core schema. Timestamps are Unix epoch milliseconds (INTEGER).
-- Calendar dates are TEXT 'YYYY-MM-DD' in the user's own timezone.
-- Times of day are INTEGER minutes after local midnight.

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  max_projects INTEGER NOT NULL,
  max_open_tasks INTEGER NOT NULL,
  ai_daily_limit INTEGER NOT NULL,
  analytics_days INTEGER NOT NULL,
  features TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  billing_price_id TEXT,
  updated_at INTEGER NOT NULL
);

INSERT INTO plans (id, name, description, price_cents, max_projects, max_open_tasks, ai_daily_limit, analytics_days, features, sort_order, updated_at) VALUES
  ('free', 'Free', 'Adaptive planning for one person getting started.', 0, 3, 100, 15, 14,
   '{"ai_assistant":true,"ai_breakdown":false,"weekly_reports":false,"advanced_analytics":false}', 1, unixepoch() * 1000),
  ('pro', 'Pro', 'Full AI planning, breakdowns and long-range insights.', 900, 50, 2000, 200, 180,
   '{"ai_assistant":true,"ai_breakdown":true,"weekly_reports":true,"advanced_analytics":true}', 2, unixepoch() * 1000),
  ('team', 'Team', 'Everything in Pro with higher limits for small teams.', 1500, 500, 20000, 1000, 365,
   '{"ai_assistant":true,"ai_breakdown":true,"weekly_reports":true,"advanced_analytics":true}', 3, unixepoch() * 1000);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  blocked_reason TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  work_start INTEGER NOT NULL DEFAULT 540,
  work_end INTEGER NOT NULL DEFAULT 1020,
  work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
  lunch_start INTEGER,
  lunch_minutes INTEGER NOT NULL DEFAULT 45,
  buffer_minutes INTEGER NOT NULL DEFAULT 10,
  max_block_minutes INTEGER NOT NULL DEFAULT 90,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  marketing_consent_at INTEGER,
  terms_version TEXT NOT NULL,
  terms_accepted_at INTEGER NOT NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  last_login_at INTEGER,
  last_active_at INTEGER,
  password_changed_at INTEGER NOT NULL,
  billing_customer_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_users_created ON users (created_at);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('app', 'admin')),
  csrf_token TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_prefix TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  absolute_expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE password_resets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_password_resets_user ON password_resets (user_id);

CREATE TABLE invite_codes (
  id INTEGER PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  plan_id TEXT NOT NULL REFERENCES plans (id),
  access_days INTEGER NOT NULL,
  starts_at INTEGER NOT NULL,
  expires_at INTEGER,
  max_uses INTEGER NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  bound_email TEXT COLLATE NOCASE,
  created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (max_uses >= 1),
  CHECK (use_count <= max_uses)
);

CREATE TABLE access_grants (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans (id),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  source TEXT NOT NULL CHECK (source IN ('admin', 'invite', 'waitlist', 'system')),
  invite_code_id INTEGER REFERENCES invite_codes (id) ON DELETE SET NULL,
  granted_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  granted_by_label TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  revoked_at INTEGER,
  revoked_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  revoked_by_label TEXT,
  revoke_reason TEXT,
  expiry_logged INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX idx_grants_user ON access_grants (user_id, starts_at, ends_at);
CREATE INDEX idx_grants_ends ON access_grants (ends_at);

CREATE TABLE access_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  grant_id INTEGER REFERENCES access_grants (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_access_events_user ON access_events (user_id, created_at);

CREATE TABLE invite_redemptions (
  id INTEGER PRIMARY KEY,
  code_id INTEGER NOT NULL REFERENCES invite_codes (id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  user_label TEXT NOT NULL DEFAULT '',
  grant_id INTEGER REFERENCES access_grants (id) ON DELETE SET NULL,
  redeemed_at INTEGER NOT NULL,
  UNIQUE (code_id, user_id)
);

CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  privacy_accepted_at INTEGER NOT NULL,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'landing',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'joined')),
  confirm_token_hash TEXT,
  confirmed_at INTEGER,
  invited_at INTEGER,
  invite_code_id INTEGER REFERENCES invite_codes (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_waitlist_created ON waitlist (created_at);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'violet',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  due_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_projects_user ON projects (user_id, status);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  due_date TEXT,
  estimate_minutes INTEGER NOT NULL DEFAULT 30,
  missed_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_completed ON tasks (user_id, completed_at);

CREATE TABLE task_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL,
  task_title TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_task_events_user ON task_events (user_id, created_at);

CREATE TABLE schedule_blocks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks (id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_min INTEGER NOT NULL CHECK (start_min BETWEEN 0 AND 1440),
  end_min INTEGER NOT NULL CHECK (end_min BETWEEN 0 AND 1440),
  kind TEXT NOT NULL CHECK (kind IN ('task', 'event', 'break')),
  title TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'missed')),
  origin TEXT NOT NULL DEFAULT 'planner' CHECK (origin IN ('planner', 'manual')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (end_min > start_min)
);
CREATE INDEX idx_blocks_user_date ON schedule_blocks (user_id, date);
CREATE INDEX idx_blocks_task ON schedule_blocks (task_id);

CREATE TABLE user_activity_days (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX idx_activity_day ON user_activity_days (day);

CREATE TABLE ai_usage (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'demo')),
  ok INTEGER NOT NULL DEFAULT 1,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ai_usage_user ON ai_usage (user_id, created_at);
CREATE INDEX idx_ai_usage_created ON ai_usage (created_at);

CREATE TABLE ai_messages (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  mode TEXT,
  proposal_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ai_messages_user ON ai_messages (user_id, id);

CREATE TABLE ai_proposals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'discarded', 'expired')),
  mode TEXT NOT NULL,
  result TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX idx_ai_proposals_user ON ai_proposals (user_id, status);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  ip_prefix TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
CREATE INDEX idx_audit_action ON audit_logs (action);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by INTEGER REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE email_outbox (
  id INTEGER PRIMARY KEY,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  transport TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'logged', 'failed')),
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_outbox_created ON email_outbox (created_at);
