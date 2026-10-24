-- Verificação transacional com registros sintéticos: nenhum preço de teste permanece.
begin;
do $$
declare first_json jsonb; next_json jsonb; other_json jsonb; old_json jsonb;
begin
 first_json:=jsonb_build_array(jsonb_build_object('observation_key',repeat('a',64),'source','PR','gtin','00000000000001','store_key',repeat('c',64),'price',10,'discount',0,'recorded_at',now()-interval '2 days'));
 next_json:=jsonb_build_array(jsonb_build_object('observation_key',repeat('b',64),'source','PR','gtin','00000000000001','store_key',repeat('c',64),'price',8,'discount',2,'recorded_at',now()-interval '1 day'));
 other_json:=jsonb_build_array(jsonb_build_object('observation_key',repeat('d',64),'source','PR','gtin','00000000000001','store_key',repeat('e',64),'price',20,'discount',0,'recorded_at',now()-interval '1 day'));
 assert public.record_price_observations(first_json)->0->'points'='[]'::jsonb;
 assert (public.record_price_observations(next_json)->0->'points'->0->>'price')::numeric=10;
 perform public.record_price_observations(next_json);
 assert (select count(*) from public.price_observations where gtin='00000000000001' and store_key=repeat('c',64))=2;
 assert public.record_price_observations(other_json)->0->'points'='[]'::jsonb;
 old_json:=public.record_price_observations(first_json);
 assert (old_json->0->>'has_newer')::boolean;
 assert not has_table_privilege('anon','public.price_observations','select');
 assert not has_table_privilege('authenticated','public.price_observations','insert');
 assert not has_function_privilege('anon','public.record_price_observations(jsonb)','execute');
 assert has_function_privilege('service_role','public.record_price_observations(jsonb)','execute');
 assert (select relrowsecurity from pg_class where oid='public.price_observations'::regclass);
end $$;
rollback;
select 'PASS: dedup, chronological previous price, store isolation, old records, RLS and service-only access. Synthetic rows rolled back.' as result;
