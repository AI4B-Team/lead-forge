create table if not exists public.lead_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, tag_id)
);

create index if not exists lead_tags_workspace_idx on public.lead_tags (workspace_id);
create index if not exists lead_tags_lead_idx on public.lead_tags (lead_id);
create index if not exists lead_tags_tag_idx on public.lead_tags (tag_id);

grant select, insert, update, delete on public.lead_tags to authenticated;
grant all on public.lead_tags to service_role;

alter table public.lead_tags enable row level security;

create policy "ws lead_tags read" on public.lead_tags for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "ws lead_tags write" on public.lead_tags for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));