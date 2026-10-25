# Pernambuco: integração regional compartilhada com o Paraná

Pernambuco usa o mesmo serviço regional público, sem conexão gov.br. Não depende do campo possuiModulo do MPBR. A lista do seletor inclui PR e PE explicitamente, e remove ambos da lista nacional para evitar duplicatas.

## Parâmetro local

`local` é o geohash da latitude/longitude, calculado pela função `geohash` existente em `lib/location.ts`, com 9 caracteres. Não é um código de município, token ou parâmetro fixo por estado.

- GPS: usa as coordenadas autorizadas do dispositivo.
- Cidade manual: usa as coordenadas cadastradas em `lib/municipality-data.json` e calcula o mesmo geohash.
- Exemplo validado com coordenadas de Recife: `geohash(-8.0476, -34.877)` = `7nx4nqgr6`.
- O centro cadastrado de Recife tem coordenadas ligeiramente diferentes (`-8.04666, -34.8771`) e gera `7nx4nr5kb`. Isso é esperado: a origem da busca é diferente.

Em 25/10/2026, consultas públicas por categorias e produtos, com `local=7nx4nqgr6`, retornaram HTTP 200, categorias e estabelecimentos com UF=PE. Foram feitas somente duas chamadas de validação, sem autenticação ou tokens.

Endpoints compartilhados:

```text
https://menorpreco.notaparana.pr.gov.br/api/v1/categorias
https://menorpreco.notaparana.pr.gov.br/api/v1/produtos
```

O parâmetro `uf=PE` permanece somente na autorização e nas rotas internas do Preço Perto. Não é enviado ao serviço oficial; nele, a região é determinada por `local`.

## Regras

PR e PE usam categorias na busca por descrição, sem expansão adicional por GTIN. Compartilham busca por código de barras, combustíveis, lista, data=3, ordenação, paginação em passos de 50, fila, retry e fallback dispositivo → servidor. A página inicial os identifica como estados sem conexão gov.br.

A autorização de PE inclui a UF, evitando reutilizar uma autorização PR para PE. Histórico direto exige a UF consultada nos estabelecimentos. A coluna `source=PR` do histórico continua representando este adaptador regional compartilhado; o identificador da loja inclui a UF, preservando a separação geográfica e por conta. Nenhuma migração do banco foi necessária.

`lib/search-provider.ts` centraliza o roteamento para evitar regras divergentes entre seleção de cidade, busca, créditos e histórico.

Testes: `tests/unit/pernambuco.test.cjs`, além dos testes de fluxo de descrição e crédito. O build executa esses testes automaticamente sem novas chamadas reais às APIs.

Referência oficial: https://www.sefaz.pe.gov.br/Noticias/Paginas/APP-Menor-Pre%C3%A7o-Pernambuco-ajuda-a-gastar-menos-na-hora-das-compras.aspx
