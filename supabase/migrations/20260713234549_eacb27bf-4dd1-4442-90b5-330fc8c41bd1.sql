create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_exists boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select exists(select 1 from public.user_roles where role = 'admin') into admin_exists;
  if admin_exists then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin')
  on conflict (user_id, role) do nothing;

  return true;
end;
$$;

grant execute on function public.claim_first_admin() to authenticated;