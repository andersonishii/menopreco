// Unit tests must not use real credentials, networks or production databases.
for(const key of Object.keys(process.env))if(/SUPABASE|MPBR|SERPER|MERCADO_PAGO/.test(key))delete process.env[key];
Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://unit.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'unit-public',SUPABASE_SECRET_KEY:'unit-secret-not-production',MPBR_TOKEN_ENCRYPTION_KEY:'unit-encryption-not-production',APP_URL:'https://site.example'});
globalThis.fetch=async()=>{throw new Error('Network disabled: provide a fetch mock in this test.');};
