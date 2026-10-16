# Extensão experimental — Preço Perto

Protótipo para Chrome no computador, exclusivo para https://menopreco-1.onrender.com. Não é uma extensão oficial do MPBR ou do gov.br e não está publicada na Chrome Web Store.

## Instalar e usar

1. Extraia o ZIP para uma pasta permanente.
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e escolha **Carregar sem compactação**. Selecione esta pasta, que contém manifest.json.
3. Recarregue o Preço Perto, tente pesquisar em um estado atendido pelo MPBR e clique em **Iniciar conexão com gov.br** quando solicitado.
4. Clique em **Conectar com a extensão do Chrome**. O Chrome exibirá um aviso de depuração. Faça login somente na página oficial do gov.br aberta em outra aba. Mantenha o DevTools fechado para não interromper a captura.
5. Se o Chrome disponibilizar o retorno nos eventos observados, a extensão validará o state, voltará ao site e enviará o código para a troca pelo token no servidor. Pesquise novamente após concluir. A aba do gov.br permanece aberta.
6. Se não funcionar, aguarde o aviso de expiração ou encerre a depuração pela barra do Chrome e use o fluxo manual. Não há garantia de captura em todas as versões do Chrome, dispositivos ou políticas empresariais.

## Permissões e dados

- `debugger`: é uma permissão ampla do navegador. Este código só a utiliza na aba criada para a tentativa iniciada pelo usuário, observando `Log.entryAdded` e `Page.frameRequestedNavigation`. Não consulta DOM, campos, cookies, conteúdo de requisições nem senhas. Nenhum script é injetado no gov.br.
- `storage`: guarda somente ID das abas, state e horário de expiração em storage.session, sem acesso por content scripts por padrão. Não persiste códigos ou tokens.
- `alarms`: encerra a captura após 10 minutos. Ela também termina após capturar o retorno, fechar a aba, cancelar a depuração ou iniciar outra tentativa na mesma aba do site.
- O script de comunicação roda somente no domínio Render listado no manifest e só no frame principal. O servidor continua validando a sessão do usuário, state, prazo e PKCE. O token fica no servidor.

O protótipo observa o erro de protocolo do navegador; não registra o protocolo do aplicativo MPBR nem modifica o login do gov.br. Não substitui uma integração oficialmente autorizada com retorno HTTPS. A captura real ainda requer validação com uma conta gov.br; testes automatizados usam dados fictícios e APIs do Chrome simuladas.

Desative ou remova a extensão em chrome://extensions quando terminar o teste. Para outro domínio, revise explicitamente o manifest e siteOrigin em guards.js antes de empacotar.
