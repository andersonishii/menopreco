# Histórico de preços

## Estado atual após remoção dos proxies do Paraná

As rotas `/api/categorias` e `/api/produtos` foram removidas a pedido do usuário. Todas as buscas do Paraná (categorias, descrição, código de barras, lista e combustíveis) consultam somente `https://menorpreco.notaparana.pr.gov.br/api/v1/` pelo navegador, após a reserva de crédito existente. Não há fallback para as duas rotas removidas. Falhas de CORS ou rede viram mensagens de indisponibilidade. A tentativa única de categorias após 6 segundos continua na API oficial, com aviso de progresso e sem outro crédito. A validação de localização, GTIN, faixas de preço, paginação e nota mais recente continua aplicada.

Essas consultas do Paraná não gravam nem consultam o histórico compartilhado: preços recebidos no navegador não são aceitos como observações confiáveis no banco. O histórico dos demais estados continua pelo servidor. Login, créditos, pagamentos, municípios, imagens e demais rotas permanecem ativos. Os registros anteriores não foram apagados. As seções históricas abaixo descrevem decisões e verificações feitas ao longo da implementação, inclusive o fluxo antigo já removido.

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
