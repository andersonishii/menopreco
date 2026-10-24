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
