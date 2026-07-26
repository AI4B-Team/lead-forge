
drop policy "auth users create workspace" on public.workspaces;
create policy "auth users create workspace" on public.workspaces for insert to authenticated
  with check (auth.uid() is not null);

revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
