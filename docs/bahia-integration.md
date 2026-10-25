# Bahia — Preço da Hora

A Bahia usa integração própria, sem conexão gov.br. A conta e a autorização de consulta do Preço Perto continuam necessárias. A localização vem do GPS autorizado ou do município confirmado.

## Contrato oficial

A rota autenticada `/api/bahia/produtos` valida a consulta e envia POST form-urlencoded para `https://precodahora.ba.gov.br/produtos/`.

| Controle | Campo oficial |
| --- | --- |
| Menor preço | `ordenar=preco.asc` |
| Maior preço | `ordenar=preco.desc` |
| Vendas mais recentes | `ordenar=data.desc` |
| Menor distância | `ordenar=distancia.asc` |
| Menor preço do dia ou mais recente | `data.desc`, seguido da comparação local por dia/preço |
| Descrição / barras | `termo` / `gtin` |
| Combustível | `anp=GASOLINA`, `ETANOL`, `DIESEL`, `GNV` |
| Localização / raio | `latitude`, `longitude`, `raio` (1–30 km) |
| Período | `horas` (12, 24, 36, 48, 60 ou 72) |
| Categorias | `categorias`, códigos separados por vírgula |
| Preços opcionais | `precomin`, `precomax`, com ponto decimal |
| Página | `pagina`, iniciando em 1 |

Período e limites de preço também atendem combustíveis e lista de compras. As categorias da descrição são descobertas na resposta e selecionadas para a próxima busca. Gasolina segue a família oficial; não há opção inventada de gasolina aditivada separada.

Desconto e quantidade de ofertas são ordenações locais. A ordenação dos resultados é exclusivamente local, sem nova consulta, inclusive quando faltam extremos globais. O seletor superior define somente a próxima busca. Os filtros ficam congelados por pesquisa, inclusive nas páginas, repetição e cache de 30 minutos. Editar os campos afeta a próxima busca.

A paginação respeita `totalPaginas`, inclusive quando o serviço limita páginas apesar de um total maior de registros. Não usa offsets de 50 nem o número de cartões agrupados. O intervalo de preços da resposta é informativo; não vira filtro automático na Bahia.

## Sessão e histórico

O servidor inicia sessão anônima normal no site oficial e obtém cookies e CSRF novos, separados por conta, em memória por dez minutos. Não utiliza cookies copiados dos exemplos, credenciais gov.br ou chamadas de antivírus. A fila aplica intervalo de dois segundos. Bloqueio/challenge interrompe as consultas e aplica espera, sem rotação para contornar limites. Expiração explícita de CSRF permite uma renovação.

As respostas validam página, localização, UF, GTIN e raio. Código 50 representa resultado vazio válido; 80 representa sucesso. Preço pago usa `precoLiquido`, tabela usa `precoUnitario`; desconto é a diferença, com três casas preservadas para combustível.

O histórico recebe notas antes da seleção da mais recente por produto/loja. Usa a partição existente `BR`, com identidade isolada `bahia-validated-v1`, sem misturar estabelecimentos de outros provedores. Não exige migração ou nova variável de ambiente.

## Validação

Em 25/10/2026, o adaptador foi exercitado com sessão anônima nova: quatro ordenações de gasolina em Salvador, descrição arroz, GTIN dessa resposta, categoria/período/preço combinados, página 2 e termo inexistente. As nove consultas corresponderam ao contrato: páginas com 25 registros, GTIN com um registro, termo inexistente com código 50. Evidência local sem segredos: `artifacts/bahia/live-contract-results.json`.

`bahia.test.cjs` cobre contrato, autorização, isolamento de sessão, CSRF, bloqueios, cache, paginação e histórico. `ui.test.cjs` exercita handlers reais de descrição, combustível e lista, inclusive preservação dos filtros. O build Render executa os testes antes de compilar. A disponibilidade futura da fonte continua uma dependência externa.
