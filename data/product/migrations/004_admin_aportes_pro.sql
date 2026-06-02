create table if not exists contribution_inbox_dispositions (
  submission_id text primary key,
  state text not null check (state in ('active', 'archived', 'removed')),
  note text not null default '',
  reviewer_clerk_user_id text references faro_users(clerk_user_id) on delete set null,
  reviewer_name text not null default 'Equipo Faro',
  updated_at timestamptz not null default now()
);

create index if not exists contribution_inbox_dispositions_state_idx
  on contribution_inbox_dispositions(state, updated_at desc);

alter table curated_contribution_evidence
  add column if not exists media_type text,
  add column if not exists media_object_key text,
  add column if not exists media_mime_type text,
  add column if not exists media_size_bytes integer,
  add column if not exists media_alt_text text;

alter table curated_contribution_evidence
  drop constraint if exists curated_contribution_evidence_media_type_check;

alter table curated_contribution_evidence
  add constraint curated_contribution_evidence_media_type_check
  check (media_type is null or media_type in ('image'));
