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

create table if not exists contribution_review_events (
  id bigserial primary key,
  submission_id text not null,
  status text not null check (status in ('submitted', 'needs_more_info', 'accepted_for_review', 'approved', 'rejected')),
  note text not null default '',
  reviewer_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  reviewer_name text not null default 'Equipo Faro',
  created_at timestamptz not null default now()
);

create index if not exists contribution_review_events_submission_created_idx
  on contribution_review_events(submission_id, created_at asc, id asc);

create table if not exists contribution_review_links (
  id text not null,
  submission_id text not null,
  target_type text not null check (target_type in ('case', 'workspace')),
  target_id text not null,
  target_label text not null default '',
  note text not null default '',
  linked_by_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  linked_by_name text not null default 'Equipo Faro',
  created_at timestamptz not null default now(),
  primary key (submission_id, id)
);

create index if not exists contribution_review_links_target_idx
  on contribution_review_links(target_type, target_id, created_at desc);

create index if not exists contribution_review_links_submission_idx
  on contribution_review_links(submission_id, created_at asc, id asc);
