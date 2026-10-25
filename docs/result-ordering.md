# Ordenação dos resultados

O seletor junto ao termo define a ordem da próxima pesquisa. O seletor dos resultados reorganiza localmente as ofertas carregadas, em todos os estados, sem modificar o seletor da busca.

Menor/maior preço só dispara consulta complementar se os limites globais informados pela API comprovarem que o extremo ainda está ausente. Atualmente esse metadado é fornecido pelo Paraná. O resumo calculado das ofertas carregadas nos demais estados não comprova um limite global e nunca provoca uma consulta com essa finalidade.

Cada ordem consultada com sucesso fica registrada na pesquisa, evitando repetir consultas quando o extremo pertence a uma nota antiga que foi removida da lista atual. A consulta complementar reutiliza a autorização da pesquisa, junta as ofertas, elimina duplicatas e mantém somente as notas atuais por produto/loja. A paginação continua a partir de 50 na nova ordem; falhas preservam a lista e o cursor e permitem repetir a consulta complementar.

Distância, data, desconto e quantidade de ofertas são ordenações locais dos dados disponíveis. Sem um limite global correspondente não há como comprovar que todas as ofertas relevantes estão carregadas. O texto da tela informa que a ordenação considera os dados carregados.

A ordem inicial, a ordem visual e as ordens já consultadas são salvas no cache da pesquisa por 30 minutos.

Validação: verify-local-order.mjs, verify-result-refresh.mjs, verify-national-flow.mjs, verify-parana-pagination.mjs, verify-groups.mjs e build Next.js.
