import {cpSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=fileURLToPath(new URL('./',import.meta.url));
for(const path of ['app/page.tsx','app/layout.tsx','app/globals.css','app/api/plan/route.ts','app/api/account/route.ts','app/api/credits/route.ts','app/api/checkout/route.ts','app/api/payments/webhook/route.ts','app/api/cidades/route.ts','app/api/categorias/route.ts','app/api/produtos/route.ts','components/barcode-camera.tsx','components/account-panel.tsx','components/store-address.tsx','components/pix-checkout.tsx','components/fuel-search.tsx','components/shopping-list.tsx','lib/credit-server.ts','lib/cpf.ts','lib/payment-server.ts','lib/credit-client.ts','lib/offer-details.ts','lib/product-groups.ts','lib/shopping-price.ts','lib/description-response.ts','public']){
 mkdirSync(dirname(join(target,path)),{recursive:true});
 cpSync(join(root,path),join(target,path),{recursive:true});
}
