# Preço Perto

Comparador de preços por descrição, código de barras e lista de compras.

## Publicar o site completo no Render

No serviço existente, abra Settings → Build & Deploy e configure:

- Root Directory: `render-app`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Plano: Free

Salve e use Manual Deploy → Deploy latest commit. Se houver Health Check Path configurado como `/health`, altere para `/`.

A página inicial será o comparador completo. A versão do Render usa Next.js com Node e não executa o runtime Cloudflare. O script de build copia os componentes e as rotas originais, preservando a mesma interface e regras. O `render.yaml` também permite criar o serviço por Blueprint.

Localmente: entre em `render-app`, execute `npm ci`, `npm run build` e `npm start`, e acesse http://localhost:3000.

## Diagnóstico da API

A pasta `diagnostico` continua disponível separadamente. Para publicá-la, use Root Directory `diagnostico`, Build Command `node --check server.mjs` e Start Command `npm start`. Ela não é a página inicial do comparador.

## Versão Sites

A implementação original na raiz continua preparada para Cloudflare/Sites. Seus comandos de build não devem ser usados no Render. A publicação existente no Sites permanece independente.
