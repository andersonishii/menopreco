begin;
alter table public.credit_accounts alter column remaining set default 0;
alter table public.credit_accounts add column if not exists free_granted boolean not null default true;
alter table public.credit_accounts alter column free_granted set default false;
-- Preserve paid balances. Existing free accounts keep at most 2 credits.
update public.credit_accounts a set remaining=2 where a.id like 'user:%' and a.remaining>2 and not exists(select 1 from public.credit_orders o where 'user:'||o.user_id=a.id and o.credited_at is not null);
create or replace function public.choose_free_plan(p_account text)
returns integer language plpgsql security definer set search_path='' as $$
declare account public.credit_accounts;
begin
 if p_account not like 'user:%' then raise exception 'login_required'; end if;
 insert into public.credit_accounts(id,remaining) values(p_account,0) on conflict do nothing;
 select * into account from public.credit_accounts where id=p_account for update;
 if account.free_granted then return -1; end if;
 update public.credit_accounts set remaining=remaining+2,free_granted=true where id=p_account returning remaining into account.remaining;
 return account.remaining;
end $$;
revoke execute on function public.choose_free_plan(text) from public,anon,authenticated;
grant execute on function public.choose_free_plan(text) to service_role;
commit;
