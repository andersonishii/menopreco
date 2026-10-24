import assert from 'node:assert/strict';
const {markConnection,connectionSource,savedConnection}=await import('./lib/connection.ts');
for(const source of ['device','server'])for(const status of [200,502]){
 const response=markConnection(Response.json({value:42},{status,headers:{'Cache-Control':'no-store'}}),source);
 assert.equal(response.status,status);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(connectionSource(response),source);assert.deepEqual(await response.json(),{value:42});
}
assert.equal(connectionSource(new Response()),null);assert.equal(savedConnection('device'),'device');assert.equal(savedConnection('server'),'server');assert.equal(savedConnection('unknown'),null);assert.equal(savedConnection(undefined),null);
console.log('PASS: connection metadata preserves response body/status/headers and never guesses unknown cached origins.');
