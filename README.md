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

## Ativar cadastro e créditos

1. No Supabase, abra SQL Editor e execute `supabase/credits.sql` e depois `supabase/required-login.sql` e `supabase/unlimited-access.sql`. As tabelas ficam protegidas por RLS e são acessíveis somente ao servidor.
2. No Render → Environment, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL base do projeto.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Publishable key.
   - `SUPABASE_SECRET_KEY`: Secret key (ou service_role legada), somente no servidor.
   - `MERCADO_PAGO_ACCESS_TOKEN`: token do vendedor de teste.
   - `MERCADO_PAGO_TEST_MODE`: `true` durante os testes; `false` somente para cobrança real com credenciais de produção.
   - `APP_URL`: `https://menopreco-1.onrender.com` (sem barra final).
   - `MERCADO_PAGO_WEBHOOK_SECRET`: segredo de assinatura disponível ao configurar Webhooks no painel do Mercado Pago. Nunca publicar essas chaves no Git.
3. Supabase → Authentication → URL Configuration: Site URL igual a `APP_URL`. Mantenha confirmação de e-mail ativada. Configure envio SMTP para uso público, conforme limites de envio do Supabase.
4. Mercado Pago → Webhooks: URL `https://menopreco-1.onrender.com/api/payments/webhook`, evento Payments. Configure o segredo de assinatura no Render. A aplicação também envia notification_url ao criar o checkout.
5. Faça deploy do último commit no Render e teste com comprador de teste distinto do vendedor.

Cadastro e login são obrigatórios. Após confirmar o e-mail, a conta escolhe entre 2 consultas gratuitas (uma única vez) ou R$ 5,00 por 10 consultas. Sem saldo, novas consultas são bloqueadas e a tela apresenta os planos. O gratuito não se renova. Saldos comprados existentes são preservados pela migração.

Cada nova busca por descrição, código de barras ou combustível consome um crédito; cada código distinto na lista consome um crédito. Ordenação, seleção de categoria e paginação reutilizam a autorização por 30 minutos. Consultas iniciadas consomem crédito mesmo se não houver oferta ou o serviço externo falhar. Resultados da última consulta continuam visíveis após o saldo acabar.

“Esqueci minha senha” envia um link pelo Supabase. Em Authentication → URL Configuration, inclua `https://menopreco-1.onrender.com/?recovery=true` nas Redirect URLs permitidas. O link abre a tela de nova senha; depois o usuário entra novamente. O envio depende do SMTP e dos limites do Supabase.

Pagamento aprovado de R$ 5,00 em BRL para o vendedor da integração libera 10 consultas no pedido registrado; notificações repetidas não duplicam créditos. O redirecionamento do checkout nunca libera créditos sozinho. Confira o saldo em Minha conta após a notificação. Use a frase “Oferta de lançamento: R$ 5,00”, sem referência a preço anterior não comprovado.

Verificações locais: `node verify-access.mjs` e `npm run build` em render-app. A integração real requer executar o SQL e configurar os serviços externos; isso não é feito pelo build.

A coluna `credit_accounts.unlimited_access` permite consultas ilimitadas quando `true`, sem consumir saldo. Somente o administrador no Supabase ou o servidor pode alterá-la; não há opção pública para ativação. A conta continua exigindo login e e-mail confirmado.

As buscas de categorias e produtos tentam primeiro a API pelo navegador, usando a conexão do usuário. Login e crédito são validados no servidor antes da consulta. Se ocorrer CORS, erro de rede ou resposta inválida, a consulta usa o Render com a mesma autorização, sem novo desconto. Nenhum cookie de login ou autorização é enviado ao Nota Paraná.


### Estados participantes do Menor Preço Brasil

Configure `MENOR_PRECO_BRASIL_TOKEN` nas variáveis de ambiente do Render com um token válido do serviço nacional. Nunca coloque esse valor em uma variável `NEXT_PUBLIC_*` ou no Git. Quando expirar, a configuração precisa ser atualizada; a aplicação não implementa login gov.br nem renovação automática.

A lista dos novos estados vem de `Config/UfsParticipantes`, incluindo somente `possuiModulo === true`. O Paraná usa sua integração anterior como exceção explícita. Nos outros estados, a descrição usa `Item/PorDescricao`, o código de barras usa `Item/PorGtin` (NCM é classificação fiscal) e combustível usa `Item/PorCombustivel`.

As consultas nacionais usam a latitude e longitude autorizadas pelo usuário ou as coordenadas de referência do município selecionado. A busca por município e UF usa a base [Municípios Brasileiros](https://github.com/kelvins/municipios-brasileiros), com licença em `public/municipalities-source.txt`. O resultado nacional é adaptado aos cartões existentes e não possui etapa de categoria nem paginação inventada. Apenas as ofertas retornadas são comparadas e ordenadas.

Validação: `node --experimental-strip-types verify-brasil.mjs`, `verify-city.mjs`, `verify-location.mjs` e build do `render-app`.
