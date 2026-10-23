# Preço Perto — piloto Android 0.1.1

APK de teste para validar navegador → aplicativo, antes de desenvolver o aplicativo completo. Android 8.0 ou superior. O piloto possui uma tela nativa; as pesquisas abrem o site no navegador. Ele não incorpora o gov.br em WebView e não tenta ler o console.

## Instalar e testar

1. Faça o deploy da versão atual do site no Render. O APK usa `https://menopreco-1.onrender.com/android`; sem o novo deploy essa página não existe.
2. Transfira `public/preco-perto-piloto.apk` para o celular e instale. É um APK **debug**, destinado a este teste, não à Play Store. Se solicitado pelo Android, permita a instalação para o aplicativo pelo qual você abriu o arquivo.
3. Abra **Preço Perto Piloto** e toque em **1. Testar retorno ao aplicativo**.
4. No navegador, toque em **Voltar ao aplicativo e concluir teste**. Se aparecer uma confirmação de abertura, aceite abrir o Preço Perto Piloto.
5. O aplicativo deve mostrar **Teste concluído!**. Esse teste **não faz login no gov.br nem gera token**.

Após o deploy, o APK também estará em `/preco-perto-piloto.apk`. O SHA-256 correspondente fica em `/preco-perto-piloto.apk.sha256`.

## Conexão real: dependência externa pendente

O botão **Verificar conexão com gov.br** abre a página de conexão no navegador. Por padrão ela informa que o retorno ainda não está autorizado. Não é um erro do APK.

O fluxo existente usa o cliente e o retorno do aplicativo oficial MPBR. Este piloto **não registra o esquema do aplicativo oficial** e não intercepta seu login. O provedor precisa autorizar um cliente/retorno para o Preço Perto e confirmar sua compatibilidade com os endpoints MPBR `Login/token`, `Login/refresh_token` e consultas. Cadastrar um cliente gov.br próprio, isoladamente, não garante acesso ao MPBR.

Endereço de retorno preparado:

```
br.com.precoperto.app://oauth/auth
```

Somente **depois dessa autorização e confirmação de compatibilidade**, configurar no servidor:

```
MPBR_ANDROID_CLIENT_ID=<cliente autorizado para o Preço Perto>
MPBR_ANDROID_REDIRECT_AUTHORIZED=true
```

Não definir a segunda variável para contornar a autorização. Nenhuma dessas configurações foi alterada em produção neste trabalho.

O fluxo preparado é:

1. O APK cria um identificador aleatório válido por 10 minutos e abre `/android?mode=connect&request=…` no navegador.
2. Se faltar a sessão, a página mostra o formulário para entrar na conta **Preço Perto**. Após entrar, ela verifica automaticamente a disponibilidade da conexão gov.br. Não é necessário voltar ao APK para repetir a etapa.
3. A página chama `begin_android`. O servidor cria PKCE/state e guarda a tentativa num cookie HttpOnly criptografado, vinculado à conta. O app não recebe o verificador PKCE.
4. O usuário confirma a abertura do aplicativo. O APK valida a tentativa, o endereço oficial e o retorno próprio, e abre o gov.br no navegador do sistema.
5. O retorno abre o APK. Ele valida state, prazo e fase da tentativa, e encaminha o código para a página de conclusão no **fragmento** da URL. O código não é colocado em query HTTP, logs do servidor ou armazenamento do app.
6. A página remove imediatamente o fragmento do histórico e envia o retorno por POST. O servidor valida conta/state/PKCE e guarda a autorização criptografada por usuário. A renovação preserva o cliente e o retorno usados no login.
7. O site tenta voltar ao aplicativo; se o navegador bloquear a abertura automática, existe o botão **Voltar ao aplicativo**.

Use o mesmo navegador durante o fluxo para preservar a sessão e o cookie da tentativa. Apenas um fluxo de conexão pode ficar pendente por sessão do navegador. Para produção, planejar Android App Links verificados, assinatura de distribuição, atualização do target SDK e a integração aprovada pelo provedor.

## Compilar

Instalar JDK 17+ e Android SDK Platform 34. Definir `JAVA_HOME` e `ANDROID_HOME` ou usar o Android Studio. O projeto não depende de bibliotecas Android de terceiros.

```powershell
.\gradlew.bat assembleDebug lintDebug
```

Saída: `app/build/outputs/apk/debug/app-debug.apk`.

Nesta máquina, foi necessário usar o `aapt2` já instalado no SDK para a compilação offline. O caminho é uma opção de execução local, não está gravado na configuração do projeto.

## Verificação executada

- `node verify-android-pilot.mjs`: guardas Java de endereço, retorno, state, prazo, PKCE e parâmetros duplicados.
- `node --experimental-strip-types verify-mpbr-android.mjs`: bloqueio sem autorização/configuração; fluxo e renovação com cliente Android, isolamento entre contas e criptografia. **Serviços externos simulados**.
- `verify-mpbr-auth.mjs` e `verify-mpbr-extension.mjs`: regressão do fluxo existente do computador.
- Build Android, Android Lint (sem erros; avisos de versão/SDK) e build de produção Next.js.
- Instrumentação no emulador Android 14/API 34: abertura do APK, botões, tentativa aleatória, retorno sintético correto/incorreto/repetido, resolução do esquema próprio e separação entre teste e conexão. Sem login real no gov.br e sem teste em celular físico.

Para repetir a instrumentação em um emulador de teste:

```powershell
.\gradlew.bat assembleDebug assembleDebugAndroidTest
adb -s <emulador-de-teste> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <emulador-de-teste> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <emulador-de-teste> shell am instrument -w com.precoperto.piloto.test/com.precoperto.piloto.PilotInstrumentation
```

Referências: [retorno e autenticação gov.br](https://acesso.gov.br/roteiro-tecnico/iniciarintegracao.html), [deep links Android](https://developer.android.com/training/app-links/deep-linking).

Versão 0.1.1: botão de conexão renomeado, pendência do login real explícita e formulário do Preço Perto na própria página Android quando faltar a sessão.
