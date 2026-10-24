# Auditoria do histórico — 24/10/2026

## Resultado

O histórico não cobre todas as consultas atuais. A busca direta por código de barras do Paraná, introduzida para evitar o erro 502 do servidor, marca os resultados com `historyUnavailable: true` e não grava nem consulta o histórico compartilhado. O aviso mostrado no print é esperado nesse caminho; não prova uma falha do Supabase.

As buscas por descrição que concluem pelo servidor e as buscas nacionais mantêm `withPriceHistory`. A recuperação direta após falha externa também não grava histórico. O servidor não aceita preços enviados pelo navegador como registros confiáveis.

## Banco de produção

Consulta realizada pelo editor SQL do projeto no Supabase, sem usar cookies ou tokens enviados no chat:

| Origem | Observações | GTINs | Última gravação (Brasília) | Produto/loja com mais de uma data |
|---|---:|---:|---|---:|
| Paraná | 224 | 6 | 24/10/2026 16:08:14 | 0 |
| Demais estados | 154 | 43 | 24/10/2026 12:08:26 | 0 |

Essas contagens incluem registros antigos; não atestam a qualidade de todos os preços coletados antes da correção das respostas do Paraná. A chave atual do histórico isola os registros antigos do Paraná.

A consulta de integridade encontrou **zero observações duplicadas**.

A rotina SQL foi testada em produção dentro de uma transação desfeita: gravação, deduplicação, preço anterior em ordem cronológica, isolamento entre lojas, identificação de registro mais recente e restrições de acesso passaram. Nenhum preço fictício permaneceu no banco.

## Exibição e regras

- `verify-price-history.mjs`: normalização do GTIN, identidade da loja, preço/desconto, datas, alta, queda, preço igual, primeiro registro e indisponibilidade do banco.
- `verify-latest-offers.mjs`: só a nota mais recente fica visível, e as anteriores são preservadas no fluxo de histórico do servidor.
- `verify-history-display.mjs`: renderização do componente real para alta, queda, preço igual, primeiro registro, nota antiga, datas e aviso de indisponibilidade. Verifica também o estado acessível inicial do botão; não substitui um teste de interação no navegador.

Os testes passaram. Como o banco real ainda não tem duas datas para o mesmo produto na mesma loja, as mensagens de alta e queda foram verificadas com dados controlados, sem afirmar uma variação real em produção.

## Limitação a resolver

Para restabelecer o histórico nas consultas diretas, será necessário integrar a busca direta a uma rotina de histórico que valide os dados na origem. Não basta remover o aviso: isso esconderia a ausência de coleta. Não se deve voltar a bloquear a busca quando o servidor falhar nem aceitar preços arbitrários do cliente no histórico compartilhado.

Esta auditoria adiciona testes e consultas de verificação; não altera o comportamento da aplicação.
