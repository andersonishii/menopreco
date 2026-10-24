-- Histórico compartilhado: sem usuário, termo de busca ou localização do dispositivo.
-- Apenas o servidor grava observações recebidas das APIs de preços.
begin;
create table if not exists public.price_observations (
 observation_key text primary key check (observation_key ~ '^[a-f0-9]{64}$'),
 source text not null check (source in ('PR','BR')),
 gtin text not null check (gtin ~ '^[0-9]{14}$'),
 store_key text not null check (store_key ~ '^[a-f0-9]{64}$'),
 price numeric(12,3) not null check (price>0 and price<=1000000),
 discount numeric(12,3) not null check (discount>=0),
 recorded_at timestamptz not null,
 first_seen_at timestamptz not null default now()
);
create index if not exists price_observations_lookup on public.price_observations(source,gtin,store_key,recorded_at desc);
alter table public.price_observations enable row level security;
revoke all on public.price_observations from public,anon,authenticated;
grant select,insert on public.price_observations to service_role;
create or replace function public.record_price_observations(observations jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if jsonb_typeof(observations)<>'array' or jsonb_array_length(observations)>200 then raise exception 'Invalid observations'; end if;
 -- Consistent order prevents batch inserts from deadlocking on duplicate concurrent searches.
 insert into public.price_observations(observation_key,source,gtin,store_key,price,discount,recorded_at)
 select x.observation_key,x.source,x.gtin,x.store_key,x.price,x.discount,x.recorded_at
 from jsonb_to_recordset(observations) as x(observation_key text,source text,gtin text,store_key text,price numeric,discount numeric,recorded_at timestamptz)
 where x.recorded_at between '2000-01-01'::timestamptz and now()+interval '5 minutes'
 order by x.observation_key on conflict do nothing;
 select coalesce(jsonb_agg(jsonb_build_object('observation_key',x.observation_key,
  'has_newer',exists(select 1 from public.price_observations p where p.source=x.source and p.gtin=x.gtin and p.store_key=x.store_key and p.recorded_at>x.recorded_at),
  'points',coalesce((select jsonb_agg(jsonb_build_object('price',p.price,'recordedAt',p.recorded_at,'discount',p.discount) order by p.recorded_at desc,p.price)
    from (select h.price,h.recorded_at,h.discount from public.price_observations h
     where h.source=x.source and h.gtin=x.gtin and h.store_key=x.store_key and h.recorded_at<x.recorded_at
     order by h.recorded_at desc,h.price limit 8) p),'[]'::jsonb))), '[]'::jsonb) into result
 from jsonb_to_recordset(observations) as x(observation_key text,source text,gtin text,store_key text,recorded_at timestamptz);
 return result;
end $$;
revoke all on function public.record_price_observations(jsonb) from public,anon,authenticated;
grant execute on function public.record_price_observations(jsonb) to service_role;
commit;
