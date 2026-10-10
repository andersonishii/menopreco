import {cpSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=fileURLToPath(new URL('./',import.meta.url));
for(const path of ['app/page.tsx','app/layout.tsx','app/globals.css','app/api/cidades/route.ts','app/api/categorias/route.ts','app/api/produtos/route.ts','components/shopping-list.tsx','lib/product-groups.ts','lib/shopping-price.ts','lib/description-response.ts','public']){
 mkdirSync(dirname(join(target,path)),{recursive:true});
 cpSync(join(root,path),join(target,path),{recursive:true});
}
