# Histórico de preços

## Estado atual: busca direta com histórico por usuário

As rotas `/api/categorias` e `/api/produtos` foram removidas a pedido do usuário. Todas as buscas do Paraná (categorias, descrição, código de barras, lista e combustíveis) consultam somente `https://menorpreco.notaparana.pr.gov.br/api/v1/` pelo navegador, após a reserva de crédito existente. Não há fallback para as duas rotas removidas. Falhas de CORS ou rede viram mensagens de indisponibilidade. A tentativa única de categorias após 6 segundos continua na API oficial, com aviso de progresso e sem outro crédito. A validação de localização, GTIN, faixas de preço, paginação e nota mais recente continua aplicada.

As consultas diretas do Paraná agora enviam ofertas válidas a `POST /api/price-history`, protegido por origem, login e grant da busca. Os registros recebidos do navegador formam um histórico privado por conta, em uma versão própria da chave de estabelecimento. Não se misturam com observações verificadas pelo servidor nem com registros de outras contas. A interface identifica o histórico das suas consultas e informa que os registros não foram verificados na fonte pelo servidor. O histórico dos demais estados continua pelo servidor. Login, créditos, pagamentos, municípios, imagens e demais rotas permanecem ativos. Os registros anteriores não foram apagados. As seções históricas abaixo descrevem decisões e verificações feitas ao longo da implementação, inclusive o fluxo antigo já removido.

As consultas de produtos dos demais estados por descrição, GTIN e lista de compras alimentam um histórico compartilhado. Combustíveis também participam quando a resposta contém GTIN, endereço e data válidos. Sem esses identificadores, não é feita uma comparação aproximada por nome.

O histórico considera GTIN normalizado, fonte da API e estabelecimento (UF, município, endereço, número, complemento e nome). Não compara preços de lojas diferentes como se fossem aumento ou queda. O preço usado é o valor final registrado, preservando a indicação de desconto. A data é a da nota fiscal, não a data da consulta.

A interface mostra queda, alta, estabilidade ou primeiro registro, com diferença em reais e percentual. O painel lista até oito registros anteriores da mesma loja. Se a oferta retornada for mais antiga que outra já armazenada, ela é identificada como antiga e não recebe uma seta de alta ou queda. Diferenças podem decorrer de condições comerciais; o histórico não garante preço atual de prateleira.

## Banco e segurança

`supabase/price-history.sql` cria a tabela e o RPC `record_price_observations`. A migração foi aplicada ao projeto usado pelo site, e `supabase/verify-price-history.sql` passou com dados sintéticos em uma transação revertida. Não há preços de teste persistidos.

Somente `service_role` acessa a tabela e executa o RPC. RLS permanece habilitado. Não são armazenados usuário, e-mail, termo pesquisado ou posição do dispositivo. O estabelecimento é representado por hash; preços, GTIN e datas são compartilhados entre consultas.

Para evitar gravações de preços forjados pelo navegador, `/api/brasil/produtos` enriquece as respostas dos demais estados no servidor. As buscas do Paraná usam exclusivamente o navegador e não enriquecem o histórico. A interface não possui endpoint para submeter preços arbitrários. Registros idênticos são deduplicados; consultas repetidas não geram novas linhas para a mesma observação.

O histórico tem orçamento de quatro segundos por consulta e não pode bloquear as ofertas se o banco estiver indisponível. Nesse caso, a interface informa indisponibilidade temporária. Abrir o painel do histórico não faz nova consulta paga.

Após o deploy, novas consultas começam a alimentar o histórico. O cache existente de resultados pode conservar informações anteriores por até 30 minutos; uma nova pesquisa atualiza os dados. Não há importação retroativa de consultas feitas antes desta funcionalidade.

## Verificações

`verify-price-history.mjs`: identidade, GTIN com zeros à esquerda, separação entre lojas, preço/desconto, datas, deduplicação do lote, privacidade, estados de comparação e falha do banco sem perda da oferta.

`supabase/verify-price-history.sql`: insert idempotente, preço anterior cronológico, isolamento por loja, reconhecimento de oferta antiga, RLS e privilégios, com rollback dos registros sintéticos.

Também foram verificadas as buscas do Paraná, buscas nacionais, autenticação/créditos, ordenação de ofertas, lista de compras e combustíveis. A produção do site depende do deploy no Render; a estrutura do banco já está pronta.

## Ofertas exibidas

Todas as notas válidas retornadas pela API são enviadas ao histórico antes da filtragem. A lista de ofertas mostra somente o registro de data/hora mais recente por GTIN e estabelecimento, mesmo se uma nota anterior tiver preço menor. Registros empatados exatamente na data/hora são preservados. Não se misturam lojas diferentes nem se agrupam produtos apenas pelo nome. A filtragem também se aplica à combinação de páginas e restauração dos resultados de produtos. No Paraná, a paginação avança 50 posições por chamada, mesmo quando a API devolve menos ofertas. O total informado pela API encerra a paginação; sem total, uma página vazia encerra a consulta. Agrupamento e seleção da nota mais recente não alteram o offset.

## Qualidade das respostas do Paraná

As rotas do Paraná encaminham somente o User-Agent real do navegador e Accept para a API pública. Cookies, autorização e créditos do Preço Perto não são enviados ao Nota Paraná. Nos testes com o mesmo GTIN e filtros, a chamada sem esse User-Agent retornou textos alterados; a chamada com o User-Agent retornou descrições corretas. Esse comportamento foi observado, não presumido a partir da aparência dos nomes.

Respostas não vazias com localização inconsistente ou GTIN diferente do consultado são rejeitadas antes da gravação. Resultados vazios válidos continuam sendo aceitos. As observações antigas do Paraná foram isoladas por uma nova versão da chave de estabelecimento no histórico: não são apagadas, mas não participam das novas comparações. As observações dos demais estados preservam as chaves existentes. O cache de resultados anterior à correção é invalidado uma vez, mantendo os 30 minutos de validade do novo cache.


## Recuperação de consultas do Paraná

A consulta de produtos usa fetch com URL e opções explícitas, sem cache externo. Falhas registram somente etapa, código e status HTTP, sem parâmetros, credenciais ou dados do usuário. Quando a rota informa falha externa ou resposta inconsistente, o navegador tenta a API pública com o crédito já reservado e sem enviar credenciais. A resposta precisa passar pelas mesmas validações de localização e GTIN. Erros de conta, saldo, autorização e processamento não acionam essa recuperação.

Nessa recuperação, a lista continua selecionando a nota mais recente por produto e loja, mas o histórico fica indisponível: preços recebidos no navegador não são enviados ao banco compartilhado. Se a recuperação também falhar, o erro original permanece.


## Parâmetros de produtos no Paraná

Buscas por descrição com categoria e por código de barras usam `/api/v1/produtos` com `data=3` e a ordenação solicitada: `0` menor preço, `1` menor distância, `2` data da venda, `3` maior preço. Isso vale tanto no servidor quanto na consulta direta e recuperação pelo navegador. Localização, raio, categoria, GTIN e paginação permanecem os escolhidos na busca. A ordenação visual continua aplicada aos resultados carregados. Combustíveis mantêm suas ordenações existentes.


## Código de barras: consulta direta no Paraná

Após reservar o crédito, buscas por GTIN no Paraná consultam primeiro a API oficial no navegador. Uma resposta válida, inclusive sem ofertas, encerra a consulta sem chamar `/api/produtos` do site. Se houver falha de rede, CORS ou dados inconsistentes, há uma única tentativa pelo servidor, com o mesmo crédito; não há nova tentativa direta depois dela. Localização, GTIN e notas mais recentes continuam validados. Como os resultados diretos não passam pelo servidor, essas consultas não gravam nem consultam o histórico compartilhado e indicam histórico indisponível. Buscas por descrição e demais estados mantêm o fluxo anterior.


Na busca por descrição do Paraná, a primeira página após a categoria não envia faixa de preço. Os valores válidos de `precos.min` e `precos.max` dessa resposta são preservados nas próximas páginas como `valor_min` e `valor_max`, inclusive ao restaurar o cache. Uma nova busca, categoria, região ou modo reinicia a faixa. Dados ausentes ou inválidos não são usados como limites.


## Indisponibilidade e retomada da paginação

Respostas 429/503 e erros 500 com `es_rejected_execution_exception` são tratados como sobrecarga temporária do Nota Paraná. O site retorna uma mensagem legível (503, `PARANA_UPSTREAM_BUSY`, Retry-After de 10 segundos) sem repetir imediatamente a consulta por outro caminho. A tentativa manual usa a mesma página e o crédito existente. Ofertas já carregadas permanecem na tela. O cache agora guarda uma versão da paginação e o offset da última página concluída. Caches antigos sem esse marcador retomam em 50, preservando as ofertas existentes e deduplicando eventuais repetições. Caches novos retomam exatamente após a última página confirmada. Uma falha não avança esse marcador. Essa proteção não elimina a indisponibilidade da API externa.


## Formato da consulta oficial

Na busca padrão por descrição no Paraná, a consulta de produtos usa `local`, `termo`, `categoria`, `offset=0`, `raio`, `data=3` e `ordem=0`, sem limites de preço na primeira página. A opção visual de menor preço do dia continua aplicada localmente. Seleções explícitas de distância, data da venda ou maior preço preservam os códigos oficiais 1, 2 e 3. As próximas páginas mantêm a ordem da consulta original. Consultas já salvas mantêm sua ordem anterior até uma nova busca, evitando misturar páginas ordenadas por critérios diferentes.

A URL é montada da mesma forma no servidor e no navegador. O Accept dos produtos é `application/json, text/plain, */*`. Cabeçalhos de origem do navegador não são forjados: a chamada do Preço Perto continua tendo origem diferente da aplicação oficial. Localização e raio são os valores escolhidos pelo usuário. O teste automatizado compara literalmente a URL com o exemplo oficial fornecido para feminino/categoria 37/local 6gkzqf9vb/raio 7.


## Mudança de ordenação nos resultados do Paraná

Ao trocar um filtro oficial (0 preço crescente, 1 distância, 2 data da venda, 3 preço decrescente), a busca de produtos reinicia em offset 0 com a ordem escolhida e o crédito existente. As próximas páginas mantêm essa ordem. Faixa de preço e cursor são reiniciados com a nova consulta. Desconto e quantidade de ofertas continuam locais. A oferta destacada e a ordenação interna de cada GTIN passam a acompanhar também preço decrescente e data da venda, em vez de selecionar sempre a oferta mais barata.


## Encerramento por página adicional parcial

Por solicitação do usuário, uma página adicional (offset 50 ou maior) com menos de 50 ofertas recebidas da API encerra a paginação, mesmo se `total` indicar mais resultados. A contagem usa `sourceCount` anterior ao agrupamento e à filtragem de notas; uma página cheia não vira parcial apenas porque menos ofertas ficaram visíveis. A primeira página mantém o comportamento anterior, permitindo carregar offset 50 mesmo se a resposta inicial tiver menos de 50 ofertas. O total continua encerrando uma página cheia quando o limite já foi atingido. A API já apresentou páginas parciais com total maior nos testes anteriores; esta é uma regra de encerramento do site, não uma garantia geral sobre o comportamento da API.


## Nova tentativa na busca de categorias

Um 502 da rota de categorias com código `PARANA_CATEGORIES_UNAVAILABLE` (ou a mensagem equivalente de uma versão anterior) aciona uma única repetição após 6 segundos. A tela mantém a pesquisa em andamento e anuncia a espera e a nova tentativa com uma região de status acessível. A repetição usa os mesmos parâmetros e grant, sem reservar outro crédito. Erros de autenticação, resultados vazios válidos e outros tipos de erro não entram nessa regra. Uma segunda falha é apresentada normalmente; não há loop. Se o grant for limpo durante a espera, a repetição não é enviada.


## Nova tentativa para HTTP 500 do Paraná

Um HTTP 500 original da API oficial aciona uma única repetição após 8 segundos, em categorias, descrição, GTIN, lista ou combustíveis. O status original é preservado como metadado da resposta normalizada, inclusive quando uma fila cheia é apresentada como 503 amigável. A repetição mantém os parâmetros e o crédito. A tela principal anuncia o tempo de espera correspondente. O 502 de categorias mantém a repetição após 6 segundos. Há no máximo uma repetição automática por consulta, mesmo se a segunda resposta tiver outro código elegível. Limpar o grant durante a espera cancela a repetição. As buscas nacionais mantêm o fluxo existente.


## Gravação do histórico das buscas diretas

O navegador envia somente GTIN, data/hora, preço final, preço de tabela, desconto e os campos necessários para identificar o estabelecimento. Não envia descrição, número da nota, ID da oferta, distância, coordenadas ou posição do dispositivo no corpo de ofertas. O endpoint usa os parâmetros da busca apenas para verificar o grant; esses parâmetros não são gravados na tabela.

O servidor aplica limites de 64 KiB e 50 ofertas por chamada, valida campos e restringe o lote ao Paraná e ao GTIN pesquisado quando houver. Origem, sessão, conta e grant são verificados antes da gravação. O rate limit existente de consultas autenticadas também vale para essa rota. O dono do histórico vem da sessão, nunca do payload.

Os registros usam a chave de estabelecimento `sha256(client-reported-v1|userId|storeIdentity)`, sem armazenar o identificador de conta em texto aberto. A chave da observação continua incluindo GTIN, fonte, loja, data, preço e desconto, evitando duplicações. Essa separação impede que preços enviados por uma conta alterem o histórico de outra ou as comparações verificadas pelo servidor. Dados enviados pelo cliente continuam sendo não verificados, mesmo após as validações estruturais.

Todas as notas recebidas são enviadas antes de selecionar a mais recente para a lista. As comparações retornam por índice, sem devolver os dados de estabelecimento enviados ao servidor. O cliente usa lotes de até 50, limita a coleta a 200 ofertas por resposta e a duas chamadas simultâneas. A falha ou demora do histórico mantém os preços visíveis com histórico indisponível. Não é reservado outro crédito. A tabela e o RPC existentes são reutilizados; não há migração de banco necessária.

Os testes `verify-client-history-server.mjs`, `verify-client-history-flow.mjs` e `verify-history-display.mjs` cobrem isolamento, deduplicação, comparação, limites, falhas, payload mínimo e identificação dos registros na interface. Respostas bloqueadas por CORS ou com localização inconsistente não são enviadas ao histórico. Resultados antigos no cache permanecem como foram salvos; uma nova consulta começa a alimentar o novo histórico.


## Resposta HTTP 200 inconsistente e CORS

Na investigação da busca festa/categoria 31, a resposta anexada tinha `local` vazio, estabelecimentos em estados incompatíveis com a região informada e preços fora da faixa retornada. Chamadas diretas reproduziram HTTP 200 sem Access-Control-Allow-Origin e com local vazio, inclusive com cabeçalhos semelhantes aos da aplicação oficial. Isso não identifica a causa da resposta na origem; HTTP 200 por si só não comprova que os dados sejam utilizáveis.

Quando o navegador permite ler uma resposta inconsistente, o site retorna `PARANA_RESPONSE_INCONSISTENT` com mensagem específica, antes de gravar histórico. Se o navegador bloqueia a leitura por CORS, o corpo não é processado nem gravado; o painel de desenvolvimento pode exibir conteúdo ao qual o JavaScript não teve acesso. A correção do cabeçalho CORS depende do serviço de origem.


## Fila das consultas do Paraná

Categorias, descrição, código de barras, lista e combustíveis compartilham uma fila para a API oficial no navegador. Há somente uma chamada em andamento e um intervalo mínimo de 2 segundos após o recebimento completo da resposta, antes da próxima chamada. O timeout de rede começa quando a chamada sai da fila. Os retries de 6/8 segundos passam pela mesma fila e mantêm o limite de uma tentativa automática.

Pedidos da mesma URL em andamento (independentemente da ordem dos parâmetros) compartilham uma chamada externa; cada consumidor recebe uma cópia independente da resposta. Erros liberam a fila e permitem tentativas posteriores. Não há cache adicional de resultados nessa camada: o cache de 30 minutos existente permanece separado.

Quando Web Locks está disponível, um bloqueio exclusivo coordena também abas da mesma origem. Apenas o instante da próxima chamada é compartilhado no localStorage, sem termos ou preços. Sem esse recurso, ou se o navegador recusar o bloqueio antes de executar a consulta, vale a fila local da aba. Requisições idênticas são consolidadas dentro da aba; abas diferentes são serializadas, mas não compartilham o corpo da resposta. O mecanismo não coordena navegadores/dispositivos diferentes no mesmo IP e não garante a remoção de bloqueios já aplicados pelo serviço externo.

O histórico e as demais rotas do próprio site não entram nessa fila. Testes isolados verificam exclusão mútua, intervalo, leitura completa do corpo, consolidação, falhas e bloqueio entre duas filas. Um teste integrado executa chamadas concorrentes reais pelo creditFetch e confirma três chamadas oficiais para quatro solicitações, sem sobreposição e com os escopos de crédito preservados.
