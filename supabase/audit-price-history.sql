-- Read-only: production history coverage and integrity.
select source, count(*) as observations, count(distinct gtin) as products,
 max(first_seen_at) at time zone 'America/Sao_Paulo' as last_saved_brasilia,
 (select count(*) from (select gtin,store_key from public.price_observations p where p.source=o.source group by gtin,store_key having count(distinct recorded_at)>1) pairs) as comparable_product_stores,
 (select count(*) from (select gtin,store_key,recorded_at,price,discount from public.price_observations p where p.source=o.source group by gtin,store_key,recorded_at,price,discount having count(*)>1) duplicates) as duplicate_observations
from public.price_observations o group by source order by source;

select count(*) as duplicate_observations from (
 select source,gtin,store_key,recorded_at,price,discount
 from public.price_observations group by source,gtin,store_key,recorded_at,price,discount
 having count(*)>1
) duplicate_groups;
