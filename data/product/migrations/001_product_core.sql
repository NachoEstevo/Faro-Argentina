create table if not exists faro_users (
  clerk_user_id text primary key,
  email text not null default '',
  role text not null default 'investigator' check (role in ('admin', 'reviewer', 'investigator')),
  display_name text,
  active_workspace_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists investigation_workspaces (
  id text primary key,
  owner_clerk_user_id text not null references faro_users(clerk_user_id) on delete cascade,
  title text not null,
  country_code text,
  description text not null default '',
  investigation_question text,
  tags jsonb not null default '[]'::jsonb,
  case_ids jsonb not null default '[]'::jsonb,
  case_relations jsonb not null default '[]'::jsonb,
  source_links jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  analyses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investigation_workspaces_owner_updated_idx
  on investigation_workspaces(owner_clerk_user_id, updated_at desc);
