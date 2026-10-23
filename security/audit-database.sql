-- Somente leitura. Não consulta dados de usuários, pagamentos ou tokens.
select 'table' as kind, c.relname as resource, c.relrowsecurity as rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_access,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') as authenticated_access,
 has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE') as server_access
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('credit_accounts','credit_searches','credit_orders','mpbr_connections')
union all
select 'function',p.proname,null,
 has_function_privilege('anon',p.oid,'EXECUTE'),
 has_function_privilege('authenticated',p.oid,'EXECUTE'),
 has_function_privilege('service_role',p.oid,'EXECUTE')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('use_search_credit','apply_paid_credits','choose_free_plan');
