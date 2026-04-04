create extension if not exists pgcrypto;

create table if not exists public.analysis_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  user_id text null,
  birth_info jsonb not null,
  pillars jsonb not null,
  chart_data jsonb not null,
  request_payload jsonb not null,
  debug_metadata jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'requested',
  app_version text null,
  logging_error text null
);

create index if not exists analysis_logs_created_at_idx on public.analysis_logs (created_at desc);
create index if not exists analysis_logs_user_id_idx on public.analysis_logs (user_id);
create index if not exists analysis_logs_status_idx on public.analysis_logs (analysis_status);
create index if not exists analysis_logs_birth_info_gin_idx on public.analysis_logs using gin (birth_info);
create index if not exists analysis_logs_request_payload_gin_idx on public.analysis_logs using gin (request_payload);
