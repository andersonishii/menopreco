# Preço Perto · Menor Preço Paraná

Código do comparador de preços: descrição, categorias, agrupamento por GTIN, código de barras e lista de compras. A consulta por descrição aceita categorias ou produtos e volta ao fluxo normal quando a API retorna categorias. A lista permite menor preço geral, notas de hoje ou menor preço do dia mais recente.

## Testar a conexão pelo Render (gratuito)

A pasta `diagnostico/` contém um servidor independente para comparar as respostas da API a partir da rede do Render. Não precisa das dependências do site principal. O `render.yaml` configura somente esse diagnóstico.

1. Entre no Render e clique em **New → Web Service**.
2. Conecte este repositório.
3. Configure:
   - Language: **Node**
   - Root Directory: **diagnostico**
   - Build Command: **node --check server.mjs**
   - Start Command: **npm start**
   - Instance Type: **Free**
4. Clique em **Deploy Web Service**.
5. Abra a URL fornecida pelo Render e clique em **Consultar pelo servidor**.

O resultado mostra a URL consultada, status da API, formato, cabeçalhos selecionados e JSON recebido. Os padrões são `local=6gkzqf9vb`, `termo=arroz` e `raio=2`, e podem ser alterados na tela. O status HTTP 200 não garante que a API retorne categorias: confira `formato` e `resposta`.

Alternativa: **New → Blueprint**, selecionando o repositório e conferindo o plano **Free** antes de criar.

O plano gratuito pode entrar em repouso após 15 minutos sem uso. A primeira consulta pode demorar. Não há garantia de que a rede do Render receberá o mesmo resultado do 5G.

Documentação: https://render.com/docs/your-first-deploy

## Diagnóstico local

Requer Node.js 22 ou superior. Na pasta `diagnostico`, execute `npm start` e abra http://localhost:3000. Execute `npm test` para os testes. Sem dependências externas. Não é um proxy aberto: o domínio e os endpoints permitidos são fixos.

## Site principal

O código na raiz usa React, Vinext e o runtime do Cloudflare/Sites. Para desenvolver, instale as dependências (`npm run install:ci`) e execute `npm run dev`. O build é `npm run build`.

A configuração do Render acima publica **o diagnóstico**, não o site completo. O site completo continua na hospedagem original. Não publique a raiz no Render com essa configuração: ela exige adaptação do runtime de hospedagem.

## Dados

Integração não oficial com https://menorpreco.notaparana.pr.gov.br. Os dados podem apresentar formatos e conteúdos inconsistentes. Preços vêm de notas fiscais e não garantem o preço atual na loja. Cabeçalhos de cache não garantem eliminação de cache no servidor externo.
