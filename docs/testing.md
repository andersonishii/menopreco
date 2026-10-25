# Testes automáticos das regras de busca

## Como executar

Na raiz do repositório ou na pasta `render-app`:

```sh
npm test
```

`npm run test:unit` é um alias da mesma suíte. Instale antes as dependências com `npm ci` na pasta do runtime utilizado.

Os arquivos `tests/unit/*.test.cjs` são descobertos automaticamente pelo runner `scripts/run-unit-tests.mjs`. Novos arquivos nesse padrão passam a fazer parte do build sem editar uma lista manual. O runner falha se a pasta estiver vazia, algum teste falhar, um processo terminar indevidamente ou o limite global de 120 segundos for atingido.

## Bloqueio de build

- Render: `npm ci && npm run build` continua igual. O build prepara as fontes, executa a suíte e somente depois chama `next build --webpack`.
- Raiz/Sites: o lifecycle `prebuild` executa a mesma suíte antes do comando de build existente.
- Não há opção de ignorar testes nesses comandos. O build mantém também a validação TypeScript do framework.

Foi verificado com um teste temporário propositalmente quebrado que o comando de build retorna erro antes de iniciar a compilação Next. O teste temporário foi removido em seguida.

## Organização e regras cobertas

| Arquivo | Regras |
| --- | --- |
| `parana.test.cjs` | Categorias obrigatórias; zero resultados; rejeição de listas inesperadas; endpoint oficial, ordens 0–3 e data=3; descrição/código/combustível; offset de 50; limite de páginas; mínimo/máximo; resposta inconsistente; histórico antes da seleção da última nota. |
| `price-bounds.test.cjs` | Limites opcionais PR/PE, vírgula/ponto, limites parciais, validação, preservação da paginação e exclusão dos demais estados. |
| `pernambuco.test.cjs` | Geohash GPS/município, categorias e produtos regionais, seletor sem duplicatas, dispensa de gov.br, autorização e histórico de PE. |
| `brasil.test.cjs` | Somente UFs com possuiModulo=true; descrição direta; PorGtin para barras; combustível; coordenadas e UF; normalização de preço/desconto; expansão GTIN limitada; falhas parciais; token individual, renovação e reconexão gov.br. |
| `client-flow.test.cjs` | Dispositivo primeiro; fallback CORS para servidor; uma repetição após 6 ou 8 segundos; cancelamento; crédito reutilizado entre ordenação/páginas; fila sem simultaneidade, deduplicação de chamadas e cooldown. |
| `common.test.cjs` | Preço pago/tabela/desconto; agrupamento por GTIN; deduplicação; nota mais recente por loja; ordenação local e complementação por extremos comprovados; lista de compras; combustíveis dentro do raio; calendário de Brasília; filtros de distância somente com GPS; cache de 30 minutos por conta. |
| `access.test.cjs` | Autorização vinculada à conta/localização; assinatura e expiração; Paraná sem gov.br; bloqueio nacional sem conexão antes de consumir crédito. |
| `history.test.cjs` | Identidade idempotente; separação entre usuários/dados verificados; data da nota; registros inválidos; gravação das notas antigas; falha do histórico preserva preços. |
| `ui.test.cjs` | Fluxos reais de descrição PR versus demais UFs; consulta complementar sem perder resultados; estados da seção de cobertura; tendências exibidas no histórico; padrão de preço recente e filtros GPS. |

## Isolamento

Usa `node:test` e `node:assert`, sem adicionar dependências. O TypeScript já instalado transpila as fontes reais em memória; não há uma implementação paralela das regras nos testes. Cada arquivo executa em processo isolado; o helper permite isolar caches e simular dependências nas fronteiras de rede.

`tests/offline.cjs` substitui as credenciais de ambiente por valores fictícios e bloqueia fetch sem mock. Nenhum teste deve consultar Nota Paraná, MPBR, gov.br, Supabase ou pagamentos de produção. Timers de retry e cooldown usam simulações, sem aguardar segundos reais. Não há banco, login ou servidor local obrigatório.

Esses testes verificam contratos e regras da aplicação com respostas controladas; não garantem disponibilidade das APIs externas nem substituem testes de câmera, login real, acessibilidade visual ou migrações no banco.

As verificações avulsas `verify-*.mjs` e a pasta `diagnostico` continuam disponíveis, mas não são executadas indiscriminadamente no build: algumas exigem serviços reais ou um servidor em execução.
