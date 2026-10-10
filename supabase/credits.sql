-- Execute no SQL Editor do Supabase. Apenas o servidor tem acesso a créditos.
create table if not exists public.credit_accounts (
 id text primary key, remaining integer not null default 3 check(remaining >= 0)
);
create table if not exists public.credit_searches (
 id uuid primary key, account_id text not null references public.credit_accounts(id), scope text not null, created_at timestamptz not null default now()
);
create table if not exists public.credit_orders (
 id uuid primary key, user_id uuid not null references auth.users(id), payment_id text unique,
 credited_at timestamptz, created_at timestamptz not null default now()
);
alter table public.credit_accounts enable row level security;
alter table public.credit_searches enable row level security;
alter table public.credit_orders enable row level security;
revoke all on public.credit_accounts,public.credit_searches,public.credit_orders from anon,authenticated;
grant all on public.credit_accounts,public.credit_searches,public.credit_orders to service_role;
create or replace function public.use_search_credit(p_account text,p_search uuid,p_scope text)
returns integer language plpgsql security definer set search_path = '' as $$
declare balance integer; prior public.credit_searches;
begin
 insert into public.credit_accounts(id) values(p_account) on conflict do nothing;
 select remaining into balance from public.credit_accounts where id=p_account for update;
 select * into prior from public.credit_searches where id=p_search;
 if found then
  if prior.account_id<>p_account or prior.scope<>p_scope then raise exception 'invalid_search'; end if;
  return balance;
 end if;
 if balance<1 then return -1; end if;
 update public.credit_accounts set remaining=remaining-1 where id=p_account returning remaining into balance;
 insert into public.credit_searches(id,account_id,scope) values(p_search,p_account,p_scope);
 return balance;
end $$;
create or replace function public.apply_paid_credits(p_order uuid,p_payment text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare purchase public.credit_orders;
begin
 select * into purchase from public.credit_orders where id=p_order for update;
 if not found then raise exception 'unknown_order'; end if;
 if purchase.credited_at is not null then return false; end if;
 insert into public.credit_accounts(id) values('user:'||purchase.user_id) on conflict do nothing;
 update public.credit_orders set payment_id=p_payment,credited_at=now() where id=p_order;
 update public.credit_accounts set remaining=remaining+10 where id='user:'||purchase.user_id;
 return true;
end $$;
revoke execute on function public.use_search_credit(text,uuid,text),public.apply_paid_credits(uuid,text) from public,anon,authenticated;
grant execute on function public.use_search_credit(text,uuid,text),public.apply_paid_credits(uuid,text) to service_role;
