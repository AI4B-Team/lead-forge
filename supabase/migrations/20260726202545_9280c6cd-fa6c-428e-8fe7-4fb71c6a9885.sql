
-- ============ workspaces ============
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;

-- ============ workspace_members ============
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
grant select, insert, update, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

-- Helper: SECURITY DEFINER avoids RLS recursion on workspace_members
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  );
$$;

create policy "members read workspace" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "auth users create workspace" on public.workspaces for insert to authenticated
  with check (true);
create policy "members update workspace" on public.workspaces for update to authenticated
  using (public.is_workspace_member(id));

create policy "read own memberships" on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy "insert self membership" on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy "members manage" on public.workspace_members for update to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members remove" on public.workspace_members for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============ credit_balances ============
create table public.credit_balances (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,
  balance integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, kind)
);
grant select, insert, update, delete on public.credit_balances to authenticated;
grant all on public.credit_balances to service_role;
alter table public.credit_balances enable row level security;
create policy "ws credit read"  on public.credit_balances for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws credit write" on public.credit_balances for all    to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- ============ credit_ledger ============
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,
  delta integer not null,
  reason text,
  job_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.credit_ledger to authenticated;
grant all on public.credit_ledger to service_role;
alter table public.credit_ledger enable row level security;
create policy "ws ledger read"  on public.credit_ledger for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws ledger write" on public.credit_ledger for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- ============ jobs ============
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null,
  status text not null default 'queued',
  params jsonb not null default '{}'::jsonb,
  rows_in integer default 0,
  rows_deduped integer default 0,
  rows_enriched integer default 0,
  rows_skiptraced integer default 0,
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index jobs_ws_idx on public.jobs (workspace_id, created_at desc);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "ws jobs all" on public.jobs for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ leads ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  full_name text,
  business_name text,
  phone text,
  phone_type text,
  email text,
  address text, city text, state text, zip text,
  source_meta jsonb default '{}'::jsonb,
  scrub_status text default 'unscrubbed',
  quality_flags jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index leads_ws_job_idx on public.leads (workspace_id, job_id);
create index leads_ws_scrub_idx on public.leads (workspace_id, scrub_status);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "ws leads all" on public.leads for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ scrub_runs ============
create table public.scrub_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  provider text,
  total integer,
  clean_count integer,
  dnc_count integer,
  litigator_count integer,
  proof jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.scrub_runs to authenticated;
grant all on public.scrub_runs to service_role;
alter table public.scrub_runs enable row level security;
create policy "ws scrub all" on public.scrub_runs for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ sending_numbers ============
create table public.sending_numbers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phone text not null,
  area_code text,
  region text,
  health_score numeric default 100,
  optout_rate numeric default 0,
  status text default 'active',
  provider_sid text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sending_numbers to authenticated;
grant all on public.sending_numbers to service_role;
alter table public.sending_numbers enable row level security;
create policy "ws numbers all" on public.sending_numbers for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ registrations (10DLC) ============
create table public.registrations (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  brand_status text default 'unregistered',
  campaign_status text default 'unregistered',
  provider_refs jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.registrations to authenticated;
grant all on public.registrations to service_role;
alter table public.registrations enable row level security;
create policy "ws reg all" on public.registrations for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ campaigns ============
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  list_job_id uuid references public.jobs(id),
  status text default 'draft',
  send_window jsonb,
  daily_cap integer default 1500,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "ws campaigns all" on public.campaigns for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ campaign_steps ============
create table public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_order integer not null,
  delay_minutes integer not null,
  message_variants text[] not null,
  active boolean default true
);
grant select, insert, update, delete on public.campaign_steps to authenticated;
grant all on public.campaign_steps to service_role;
alter table public.campaign_steps enable row level security;
create policy "ws steps all" on public.campaign_steps for all to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id)));

-- ============ messages ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  sending_number_id uuid references public.sending_numbers(id),
  direction text not null,
  body text,
  status text,
  is_optout boolean default false,
  created_at timestamptz not null default now()
);
create index messages_ws_idx on public.messages (workspace_id, created_at desc);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "ws messages all" on public.messages for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ suppression ============
create table public.suppression (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phone text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (workspace_id, phone)
);
grant select, insert, update, delete on public.suppression to authenticated;
grant all on public.suppression to service_role;
alter table public.suppression enable row level security;
create policy "ws sup all" on public.suppression for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ adapter_requests ============
create table public.adapter_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  county text,
  record_type text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.adapter_requests to authenticated;
grant all on public.adapter_requests to service_role;
alter table public.adapter_requests enable row level security;
create policy "ws adapter all" on public.adapter_requests for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ============ municipalities (public reference) ============
create table public.municipalities (
  id bigserial primary key,
  state text not null,
  county text not null,
  city text
);
create index municipalities_state_county_idx on public.municipalities (state, county);
grant select on public.municipalities to anon, authenticated;
grant all on public.municipalities to service_role;
alter table public.municipalities enable row level security;
create policy "public read municipalities" on public.municipalities for select to anon, authenticated using (true);
