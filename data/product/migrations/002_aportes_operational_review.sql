alter table contribution_review_events
  drop constraint if exists contribution_review_events_status_check;

alter table contribution_review_events
  add constraint contribution_review_events_status_check
  check (status in (
    'submitted',
    'accepted_for_review',
    'needs_more_info',
    'approved_for_investigation',
    'approved',
    'rejected'
  ));

create table if not exists contribution_audit_events (
  id bigserial primary key,
  submission_id text,
  action text not null,
  actor_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  actor_name text not null default 'Equipo Faro',
  actor_role text not null default 'reviewer',
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contribution_audit_events_submission_idx
  on contribution_audit_events(submission_id, created_at desc);

create index if not exists contribution_audit_events_target_idx
  on contribution_audit_events(target_type, target_id, created_at desc);

create table if not exists curated_contribution_evidence (
  id text primary key,
  submission_id text not null,
  expediente_id text not null,
  status text not null check (status in ('candidate', 'published_curated', 'withdrawn')),
  title text not null,
  caption text not null,
  caveat text not null,
  source_label text not null,
  permission_note text not null,
  reviewed_by_name text not null,
  promoted_by_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  promoted_by_name text not null,
  promoted_at timestamptz not null,
  withdrawn_at timestamptz,
  withdrawn_by_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  withdrawn_by_name text,
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curated_contribution_evidence_expediente_idx
  on curated_contribution_evidence(expediente_id, status, promoted_at desc);

create index if not exists curated_contribution_evidence_submission_idx
  on curated_contribution_evidence(submission_id, updated_at desc);
