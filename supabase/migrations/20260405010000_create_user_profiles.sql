-- Create the user_profiles table for saved BaZi birth profiles.
create table if not exists user_profiles (
  user_id text primary key,
  profile_data jsonb not null,
  updated_at timestamptz not null default now()
);
