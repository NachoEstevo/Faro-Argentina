alter table investigation_workspaces
  add column if not exists verification_tasks jsonb not null default '[]'::jsonb;
