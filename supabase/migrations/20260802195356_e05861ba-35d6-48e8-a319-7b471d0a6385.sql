create or replace function public.is_workspace_admin(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

revoke execute on function public.is_workspace_admin(uuid) from public, anon;
grant execute on function public.is_workspace_admin(uuid) to authenticated, service_role;

create or replace function public.is_workspace_owner(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke execute on function public.is_workspace_owner(uuid) from public, anon;
grant execute on function public.is_workspace_owner(uuid) to authenticated, service_role;

drop policy if exists "members update workspace" on public.workspaces;
create policy "admins update workspace" on public.workspaces for update to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

drop policy if exists "owners delete workspace" on public.workspaces;
create policy "owners delete workspace" on public.workspaces for delete to authenticated
  using (public.is_workspace_owner(id));