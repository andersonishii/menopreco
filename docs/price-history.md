# Histórico de preços

As consultas de produtos por descrição, GTIN e lista de compras alimentam um histórico compartilhado. Combustíveis também participam quando a resposta contém GTIN, endereço e data válidos. Sem esses identificadores, não é feita uma comparação aproximada por nome.

O histórico considera GTIN normalizado, fonte da API e estabelecimento (UF, município, endereço, número, complemento e nome). Não compara preços de lojas diferentes como se fossem aumento ou queda. O preço usado é o valor final registrado, preservando a indicação de desconto. A data é a da nota fiscal, não a data da consulta.

A interface mostra queda, alta, estabilidade ou primeiro registro, com diferença em reais e percentual. O painel lista até oito registros anteriores da mesma loja. Se a oferta retornada for mais antiga que outra já armazenada, ela é identificada como antiga e não recebe uma seta de alta ou queda. Diferenças podem decorrer de condições comerciais; o histórico não garante preço atual de prateleira.

## Banco e segurança

`supabase/price-history.sql` cria a tabela e o RPC `record_price_observations`. A migração foi aplicada ao projeto usado pelo site, e `supabase/verify-price-history.sql` passou com dados sintéticos em uma transação revertida. Não há preços de teste persistidos.

Somente `service_role` acessa a tabela e executa o RPC. RLS permanece habilitado. Não são armazenados usuário, e-mail, termo pesquisado ou posição do dispositivo. O estabelecimento é representado por hash; preços, GTIN e datas são compartilhados entre consultas.

Para evitar gravações de preços forjados pelo navegador, `/api/produtos` e `/api/brasil/produtos` enriquecem as respostas no servidor. Categorias ainda podem usar o caminho direto do navegador. A interface não possui endpoint para submeter preços arbitrários. Registros idênticos são deduplicados; consultas repetidas não geram novas linhas para a mesma observação.

O histórico tem orçamento de quatro segundos por consulta e não pode bloquear as ofertas se o banco estiver indisponível. Nesse caso, a interface informa indisponibilidade temporária. Abrir o painel do histórico não faz nova consulta paga.

Após o deploy, novas consultas começam a alimentar o histórico. O cache existente de resultados pode conservar informações anteriores por até 30 minutos; uma nova pesquisa atualiza os dados. Não há importação retroativa de consultas feitas antes desta funcionalidade.

## Verificações

`verify-price-history.mjs`: identidade, GTIN com zeros à esquerda, separação entre lojas, preço/desconto, datas, deduplicação do lote, privacidade, estados de comparação e falha do banco sem perda da oferta.

`supabase/verify-price-history.sql`: insert idempotente, preço anterior cronológico, isolamento por loja, reconhecimento de oferta antiga, RLS e privilégios, com rollback dos registros sintéticos.

Também foram verificadas as buscas do Paraná, buscas nacionais, autenticação/créditos, ordenação de ofertas, lista de compras e combustíveis. A produção do site depende do deploy no Render; a estrutura do banco já está pronta.

## Ofertas exibidas

Todas as notas válidas retornadas pela API são enviadas ao histórico antes da filtragem. A lista de ofertas mostra somente o registro de data/hora mais recente por GTIN e estabelecimento, mesmo se uma nota anterior tiver preço menor. Registros empatados exatamente na data/hora são preservados. Não se misturam lojas diferentes nem se agrupam produtos apenas pelo nome. A filtragem também se aplica à combinação de páginas e restauração dos resultados de produtos. A paginação avança pela quantidade original da API, não pela quantidade reduzida exibida.

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
