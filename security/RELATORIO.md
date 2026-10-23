# Revisão de segurança e preparação para produção — Preço Perto

Data: 23/10/2026. Alvo: aplicação Next.js publicada pelo diretório `render-app` no Render. A revisão cobre o código atual e os recursos do Supabase usados por essa aplicação. O antigo endereço hospedado em Sites não recebe estas alterações automaticamente.

## Resultado

Foram corrigidos os problemas de aplicação descritos abaixo e criada uma nova apresentação antes do login. O build de produção foi validado. Isso não equivale a uma certificação de segurança nem garante ausência de falhas desconhecidas.

Não recomendo tratar a publicação como encerrada antes de verificar as configurações de produção listadas ao final, especialmente a assinatura do webhook. Não foram realizados pagamentos reais, login gov.br, teste de carga destrutivo ou exploração de vulnerabilidades em fornecedores.

## Falhas encontradas e tratamento

| ID | Prioridade | Como era e risco | Tratamento realizado |
|---|---|---|---|
| SEG-01 | Crítica, por dependência | Next.js 16.3.4 aparecia nos intervalos vulneráveis do npm audit, incluindo avisos de execução remota e negação de serviço. A presença da versão não prova que todos os recursos afetados eram utilizados ou que houve exploração. | Atualização para 16.4.2 e atualização dos lockfiles. Auditoria de dependências de produção do Render: zero avisos conhecidos após atualização. |
| SEG-02 | Alta | Reutilizar um identificador antigo de pesquisa podia devolver o saldo anterior pela RPC e gerar uma nova autorização de 30 minutos sem novo débito. Isso permitia renovar indefinidamente o mesmo escopo. | Antes da RPC, o servidor verifica dono, escopo e `created_at` persistidos em `credit_searches`. Pesquisa antiga retorna 409. Reutilização ainda válida mantém o prazo original, em vez de renovar o relógio. |
| SEG-03 | Alta para autenticidade e abuso | A validação HMAC do webhook era opcional: sem a variável de segredo, qualquer origem podia iniciar verificações de pagamento. Importante: o código já consultava o pagamento verdadeiro e conferia valor, moeda, ambiente e vendedor; não foi demonstrado crédito de pagamento inventado. | Segredo agora obrigatório, assinatura validada antes de chamar Mercado Pago, timestamp limitado a cinco minutos e ID coerente entre query/body. Ausência de segredo retorna 503. A idempotência do crédito no banco continua ativa. |
| SEG-04 | Alta para disponibilidade/custos | Login, recuperação, checkout e consultas não tinham limites locais consistentes. Mapas de limites de imagens/Serper podiam crescer indefinidamente por número de contas. | Limites por conta e/ou origem, com chaves resumidas em SHA-256, expiração e teto de 10 mil entradas. Foram limitadas tentativas de autenticação por IP/e-mail, geração/verificação de pagamento, conexão MPBR, pesquisas e consumo do Serper. Os limites são locais ao processo; veja a ressalva de infraestrutura abaixo. |
| SEG-05 | Alta para disponibilidade/custos | A complementação por GTIN podia gerar muitas chamadas por descrição, com até 100 páginas por código e sem prazo global. | Até 24 GTINs complementados por requisição, quatro tarefas simultâneas, 30 segundos de prazo do complemento; no Paraná, dez páginas por GTIN e 60 chamadas no total. AbortSignal é propagado. Ofertas já obtidas são preservadas e a interface avisa quando o complemento ficou parcial. Os itens da descrição não são ocultados pelo limite. |
| SEG-06 | Média | Endpoints liam JSON sem limite explícito de tamanho. Corpos grandes consumiam memória; JSON inválido podia resultar em erro genérico 500. | Leitura limitada a 32 KiB, inclusive quando não há Content-Length. Corpos grandes retornam 413; JSON inválido, nulo, escalar ou array retorna 400. |
| SEG-07 | Média | Faltavam políticas explícitas de navegador contra enquadramento em iframe, execução de scripts injetados e vazamento de referências. | Proxy de produção com CSP baseada em nonce diferente por resposta, strict-dynamic, frame-ancestors none, X-Frame-Options DENY, nosniff, Referrer-Policy no-referrer, Permissions-Policy e HSTS. Página dinâmica para não reutilizar o nonce em HTML estático. Scripts inline sem nonce não são autorizados. Estilos inline continuam permitidos por compatibilidade com a aplicação. |
| SEG-08 | Média, privacidade em dispositivo compartilhado | O cache deixava resultados, códigos da lista, dados de Pix e localização precisa no armazenamento do navegador após logout. O prazo de 30 minutos evitava usar o resultado, mas não removia o registro expirado ao lê-lo. | Limpeza desses dados no logout e após redefinir a senha; localização do dispositivo em memória é invalidada na troca de conta. Cache vencido é removido quando lido. Preferências não sensíveis, como raio e cidade manual, podem continuar salvas. Não há promessa de apagamento agendado enquanto o navegador estiver fechado. |
| SEG-09 | Baixa, defesa adicional | O verificador de assinaturas aceitava segmentos extras e a checagem de prazo não exigia explicitamente um número finito. | Assinatura com exatamente dois segmentos e tamanho limitado; autorizações precisam ter expiração numérica finita. |

## Banco de produção: conferência somente de leitura

A sessão já conectada do SQL Editor foi usada para consultar os catálogos de permissões. Não foram alteradas tabelas, saldos, funções, políticas ou dados de usuários durante essa conferência.

| Recurso | RLS | Acesso direto de anon | Acesso direto de authenticated | Acesso do service_role |
|---|---|---|---|---|
| credit_accounts | Ativo | Não | Não | Sim |
| credit_searches | Ativo | Não | Não | Sim |
| credit_orders | Ativo | Não | Não | Sim |
| mpbr_connections | Ativo | Não | Não | Sim |
| use_search_credit | Não se aplica | Sem EXECUTE | Sem EXECUTE | EXECUTE permitido |
| choose_free_plan | Não se aplica | Sem EXECUTE | Sem EXECUTE | EXECUTE permitido |
| apply_paid_credits | Não se aplica | Sem EXECUTE | Sem EXECUTE | EXECUTE permitido |

A consulta reproduzível está em `audit-database.sql`. A evidência visual foi salva fora do repositório em `q-2/artifacts/production-review/supabase-permissions.png`. Ela comprova o estado desses sete recursos na data da revisão, não as configurações de todo o projeto Supabase.

## Controles já existentes que foram revisados

- Identidade confirmada pelo Supabase no servidor, sem confiar no e-mail ou ID enviado pelo navegador.
- Créditos, planos e pagamentos vinculados à conta. Checkout confere dono do pedido; recuperação de pagamento também confere usuário. Valor do Pix é fixado no servidor.
- Pagamento aprovado validado por consulta ao Mercado Pago, com valor, moeda, ambiente e vendedor; concessão de créditos atômica/idempotente pela função SQL.
- POSTs sensíveis conferem Origin e APP_URL. Em produção, APP_URL precisa estar explicitamente configurada com HTTPS.
- Sessão em cookie HttpOnly, SameSite=Lax e Secure em produção. Tokens de autorização de pesquisa ficam na memória do cliente, não em localStorage.
- MPBR por conta, AES-256-GCM com vinculação ao usuário, PKCE S256, state e tentativa de dez minutos. Token compartilhado legado não é usado.
- Destinos dos fetches do servidor são fixos; parâmetros de pesquisa usam URLSearchParams. Não foi identificado um endpoint de proxy HTTP aberto ou SQL montado a partir do texto do usuário.
- React escapa os textos exibidos. URLs de imagens aceitam HTTPS; o componente não renderiza HTML remoto como código.
- Busca por descrição complementada no servidor usa o crédito da descrição; não abre uma cobrança por GTIN. Resultados agrupados preservam preços/horários distintos.
- Varredura dos arquivos atualmente rastreados: nenhum arquivo `.env` nem ocorrência dos padrões de segredo/JWT real pesquisados. Isso não é uma auditoria integral do histórico do Git ou das credenciais de fornecedores.

## Cobertura dos endpoints

| Superfície | Verificação principal |
|---|---|
| /api/account | Origem, limite de corpo/tentativas, confirmação de e-mail, recuperação e cookie; GET anônimo não expõe dados nem exige segredo configurado |
| /api/credits | Identidade, origem, débito, dono/escopo/prazo do identificador reutilizado e autorização assinada |
| /api/plan | Identidade/origem; plano gratuito único pela função SQL |
| /api/checkout | Dono, preço fixo, CPF válido, recuperação, pagamento real e limites por usuário |
| /api/payments/webhook | Segredo obrigatório, HMAC, prazo, ID, vendedor/valor e idempotência |
| /api/produtos e /api/categorias | Autorização por produto/região, parâmetros, timeout e limite do complemento por GTIN |
| /api/brasil/produtos | Os mesmos controles, UF participante e token individual MPBR |
| /api/brasil/conexao | Origem/identidade, state/PKCE, cookies, isolamento, renovação e limite de tentativas |
| /api/product-image e /api/online-prices | Login/origem, validação, limites, cache e destinos externos fixos |
| /api/cidades, /api/brasil/municipios e /api/brasil/estados | Metadados públicos, UF/nome válidos e caches limitados por dados do catálogo |

## Pendências antes de considerar a produção validada

1. **Mercado Pago:** conferir `MERCADO_PAGO_WEBHOOK_SECRET` no Render e a chave correspondente na aplicação Mercado Pago. Sem ela, o webhook será rejeitado. Conferir `MERCADO_PAGO_TEST_MODE=false`, token real e APP_URL HTTPS; realizar um pagamento controlado e confirmar a liberação apenas uma vez. Os testes realizados aqui são simulados, não um pagamento real.
2. **Proteção distribuída:** os novos rate limits são por processo. Reinício ou múltiplas instâncias reiniciam/dividem os contadores. Antes de escalar, usar rate limit persistente/compartilhado e proteção de borda; configurar também rate limits/CAPTCHA do Supabase para cadastro e autenticação. Não considero o limite local uma solução completa de DDoS ou de criação de múltiplas contas.
3. **Chaves:** preferir chaves exclusivas para assinatura da aplicação e `MPBR_TOKEN_ENCRYPTION_KEY`, com plano de rotação. Hoje a criptografia pode derivar do segredo do servidor do Supabase; não foi encontrada quebra dessa criptografia, mas isso acopla a rotação. Alterar a chave de criptografia exige reconectar os tokens salvos. Não modifiquei credenciais reais.
4. **MPBR/gov.br:** a extensão continua experimental, exclusiva do Chrome no computador e com permissão ampla de depuração. O código restringe a captura à tentativa iniciada, valida state e encerra após captura/prazo. Ainda assim, isso não substitui autorização oficial para uma integração web ou uma revisão para distribuir a extensão publicamente. Verificar as condições de uso da API e planejar retorno HTTPS autorizado antes de escalar essa dependência.
5. **Dependências de desenvolvimento:** o pacote isolado usado pelo Render e as dependências de produção da raiz estão sem avisos no npm audit. A auditoria completa da raiz ainda aponta avisos na antiga cadeia de ferramentas de desenvolvimento/Sites (por exemplo, globbing, Vite e dependências de build). Não foram aplicados upgrades forçados/downgrades incompatíveis. Esses pacotes não fazem parte do pacote de produção do Render; não usar esse servidor de desenvolvimento como servidor público. Ver os números em `dependency-audit.json`.
6. **Operação e privacidade:** validar backups/restauração, retenção dos dados no banco, domínio/TLS, monitoramento de falhas sem registrar CPF/senha/token e texto de privacidade. Não foram auditados integralmente o painel do Render, todas as opções de Auth do Supabase ou os contratos dos provedores.

## Validação e experiência antes do login

Os 32 scripts de regressão passaram (32/32). Os resultados estão em `test-results.json`. A revisão adicionou testes para corpo excessivo/inválido, limite de requisições, autorização malformada/sem expiração, tentativa de reuso de crédito antigo, webhook sem segredo/sem assinatura/vencido, amplificação por GTIN e limpeza de dados privados.

Também foram verificados no servidor local de build de produção: CSP com nonce diferente por resposta, presença do nonce nos scripts HTML, cabeçalhos de proteção, ausência de X-Powered-By e GET anônimo sem dados. No navegador, foram conferidos a renderização, o botão de pausa e o acesso direto ao login, sem erros de console observados. A emulação de viewport móvel não alterou a largura efetiva do navegador utilizado; não a contabilizei como validação visual em um celular real.

A nova página pública explica o benefício primeiro, demonstra uma busca com três ofertas fictícias, destaca a diferença de preço, apresenta os três passos de uso e esclarece preços registrados, descontos, localização, disponibilidade e cobrança. Tem CTA para cadastro, acesso direto ao login, pausa e tratamento de movimento reduzido. Não usa resultados fictícios como se fossem ofertas reais nem adiciona rastreadores/serviços externos à animação.

## Referências consultadas

- [Avisos de segurança do Next.js](https://github.com/vercel/next.js/security/advisories) e resultados do npm audit nos lockfiles da aplicação.
- [CSP e nonce no Next.js](https://nextjs.org/docs/app/guides/content-security-policy).
- [Webhooks e validação da assinatura no Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).
- [Permissão debugger no Chrome](https://developer.chrome.com/docs/extensions/reference/api/debugger).
