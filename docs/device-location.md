# Identificação e diagnóstico da localização do navegador

## Investigação em 25/10/2026

As coordenadas do print (`-25.0891685`, `-50.1601812`) retornaram cidade Ponta Grossa, estado Paraná e código `BR-PR` no serviço de geocodificação. A lista de estados do site em produção respondeu HTTP 200 e continha PR. Portanto, a consulta atual não reproduziu uma indisponibilidade real do Paraná; não foi possível afirmar qual requisição falhou no navegador naquele teste.

O fluxo anterior dependia de duas consultas externas/auxiliares, inclusive para PR: geocodificação direta no navegador e nova leitura da lista nacional. Uma lista indisponível era convertida em lista vazia e poderia causar falso aviso de estado não atendido. Falhas de geocodificação também eram apresentadas como indisponibilidade do próprio GPS.

## Correção

- `POST /api/localizacao` identifica cidade/UF pelo serviço de geocodificação, sem depender de CORS no navegador.
- Coordenadas são enviadas no corpo, com validação de tipo/limites, limite de payload, mesma origem e limite de chamadas. A rota só usa um destino fixo, não aceita URL arbitrária, não usa créditos e não grava coordenadas no banco ou em cache.
- O estado é normalizado por código ISO; há alternativa por nome do estado brasileiro. País estrangeiro não é aceito como Brasil.
- PR e PE usam a disponibilidade regional já conhecida, sem consultar o MPBR para validar sua participação.
- Para os demais estados, uma falha ao consultar disponibilidade é distinguida de um estado confirmado como não atendido.
- Falha de GPS, falta de permissão, identificação de cidade e disponibilidade de UF têm mensagens distintas.
- A UI mostra discretamente a última latitude/longitude e precisão recebidas do navegador, além de cidade/UF quando identificadas. O diagnóstico permanece mesmo se a identificação da cidade falhar.
- Não é possível detectar com segurança se as coordenadas vieram de GPS real ou de simulador; o texto identifica a origem como navegador.

Testes em `tests/unit/device-location.test.cjs` simulam as coordenadas do print, disponibilidade nacional indisponível, UF não atendida, falha de identificação e apresentação dos dados recebidos.
