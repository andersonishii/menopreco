# Limites opcionais de preço (PR, PE e BA)

Na área de busca, os estados Paraná, Pernambuco e Bahia exibem campos opcionais de preço mínimo e máximo. Eles se aplicam à busca por descrição, código de barras/câmera, combustíveis e lista de compras. Nos demais estados, não são exibidos nem enviados ao MPBR.

- Aceita mínimo, máximo ou ambos; em branco mantém o comportamento anterior.
- Aceita vírgula ou ponto decimal, sem separador de milhares. `1,00` e `1` são enviados como `1.00`.
- Ao sair do campo, completa duas casas e normaliza para ponto: `3` → `3.00`, `2,9` → `2.90`. Campos vazios continuam opcionais. O envio à API usa sempre ponto.
- Os campos permitem no máximo duas casas decimais ao digitar ou colar. Valores restaurados nos campos também são limitados. A precisão de três casas dos intervalos automáticos recebidos da API continua preservada no adaptador.
- Valores negativos, texto, mais de R$ 1.000.000 e mínimo maior que máximo são rejeitados antes da consulta/crédito.
- Categorias não recebem esses parâmetros. A consulta posterior de produtos recebe `valor_min` e/ou `valor_max`.
- Cada pesquisa congela os limites aplicados. Alterar os campos afeta a próxima busca, sem mudar silenciosamente as páginas dos resultados já abertos.
- Paginação, repetição e consulta complementar mantêm os limites aplicados. Os resultados salvos mantêm também esses dados por 30 minutos.
- Sem limites informados, a primeira página continua sem filtro manual; nas páginas seguintes a busca por descrição continua usando o intervalo retornado pela API, como antes. Limites manuais têm prioridade sobre esse intervalo automático.

Validação e serialização compartilhadas: `lib/price-bounds.ts`. Testes automáticos: `tests/unit/price-bounds.test.cjs` e casos de busca/paginação em `ui.test.cjs`. Nenhuma alteração no banco é necessária.

Na Bahia, o adaptador traduz os limites manuais para `precomin` e `precomax`. O intervalo recebido não vira filtro automático nas páginas seguintes; essa regra automática permanece exclusiva de PR/PE. Veja `docs/bahia-integration.md`.
