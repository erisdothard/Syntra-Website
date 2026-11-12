-- Every submission from the site's request form, written by api/demo-request.ts
-- over DATABASE_URL before any email is sent.
create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) <= 120),
  email text not null check (char_length(email) <= 254),
  -- Lowercased copy, used to allow one confirmation email per address per day.
  email_norm text not null check (char_length(email_norm) <= 254),
  company text check (char_length(company) <= 160),
  topic text check (char_length(topic) <= 120),
  message text not null check (char_length(message) <= 4000),
  -- 'new' reached the inbox; 'flagged' tripped a bot gate and was not emailed.
  status text not null default 'new' check (status in ('new', 'flagged', 'contacted', 'qualified', 'won', 'lost')),
  flag_reason text check (char_length(flag_reason) <= 200),
  -- utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_path
  attribution jsonb not null default '{}'::jsonb,
  -- Set when the visitor confirmation email was accepted for sending.
  confirmation_sent_at timestamptz
);

create index if not exists site_leads_created_at_idx on public.site_leads (created_at desc);
create index if not exists site_leads_status_idx on public.site_leads (status);
create index if not exists site_leads_email_norm_idx on public.site_leads (email_norm, created_at desc);
create index if not exists site_leads_confirmation_idx on public.site_leads (confirmation_sent_at)
  where confirmation_sent_at is not null;

-- Written and read only by the server over DATABASE_URL. On Supabase the public API
-- roles exist and must be shut out; on plain Postgres (Railway) they do not exist.
alter table public.site_leads enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.site_leads from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.site_leads from authenticated;
  end if;
end $$;
