begin;
alter table public.credit_accounts add column if not exists unlimited_access boolean not null default false;
create or replace function public.use_search_credit(p_account text,p_search uuid,p_scope text)
returns integer language plpgsql security definer set search_path='' as $$
declare balance integer; unlimited boolean; prior public.credit_searches;
begin
 insert into public.credit_accounts(id) values(p_account) on conflict do nothing;
 select remaining,unlimited_access into balance,unlimited from public.credit_accounts where id=p_account for update;
 select * into prior from public.credit_searches where id=p_search;
 if found then
  if prior.account_id<>p_account or prior.scope<>p_scope then raise exception 'invalid_search'; end if;
  return balance;
 end if;
 if not unlimited then
  if balance<1 then return -1; end if;
  update public.credit_accounts set remaining=remaining-1 where id=p_account returning remaining into balance;
 end if;
 insert into public.credit_searches(id,account_id,scope) values(p_search,p_account,p_scope);
 return balance;
end $$;
revoke execute on function public.use_search_credit(text,uuid,text) from public,anon,authenticated;
grant execute on function public.use_search_credit(text,uuid,text) to service_role;
commit;
