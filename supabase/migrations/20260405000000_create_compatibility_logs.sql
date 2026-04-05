create table if not exists public.compatibility_logs (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default timezone('utc', now()),
  user_id                 text null,

  -- Person A birth info
  name_a                  text null,
  birth_date_a            text not null,
  birth_time_a            text null,
  pillars_a               jsonb not null,

  -- Person B birth info
  name_b                  text null,
  birth_date_b            text not null,
  birth_time_b            text null,
  pillars_b               jsonb not null,

  -- Analysis result
  tier                    text not null,
  day_branch_interaction  text not null,
  day_master_relationship text not null,
  element_balance         jsonb not null,

  -- Meta
  app_version             text null
);

create index if not exists compatibility_logs_created_at_idx  on public.compatibility_logs (created_at desc);
create index if not exists compatibility_logs_user_id_idx     on public.compatibility_logs (user_id);
create index if not exists compatibility_logs_tier_idx        on public.compatibility_logs (tier);
