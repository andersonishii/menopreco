# Preço Perto — Android piloto 0.2.0

Este APK oferece um **teste independente de login gov.br e obtenção de token MPBR**. Não exige cadastro, sessão, créditos ou login no Preço Perto. Android 8.0 ou superior. É uma versão debug para validação, não um aplicativo de produção publicado na Play Store.

## Testar o login e obter o token

1. Instale `public/preco-perto-piloto.apk` no celular, atualizando a versão anterior.
2. Abra **Preço Perto Piloto** e toque em **Testar login gov.br (sem conta do site)**.
3. O APK gera PKCE, state e nonce localmente e abre o gov.br no navegador do sistema. Digite seu CPF e senha somente na página oficial.
4. Se o Android perguntar qual aplicativo deve receber o retorno, escolha **Preço Perto Piloto** para esta tentativa.
5. Ao receber o retorno correto, o APK troca o código por token diretamente no endpoint MPBR. Se a troca funcionar, aparece **Token obtido!**, com a validade.
6. Toque em **Copiar token obtido** se quiser usá-lo manualmente em uma ferramenta de teste. O conteúdo é marcado como sensível na área de transferência. **Apagar token do teste** remove o token da memória do aplicativo; não revoga o token no provedor e não apaga uma cópia que você já tenha feito.

Este fluxo funciona sem deploy do site porque não passa pelo servidor Preço Perto. O download atualizado pelo site só estará disponível depois do deploy: `/preco-perto-piloto.apk`. A verificação SHA-256 fica em `/preco-perto-piloto.apk.sha256`.

## Como o retorno funciona neste experimento

Para reproduzir o script Python e o fluxo da extensão fornecidos pelo usuário, o APK usa o mesmo cliente público MPBR (`p-mprs.sefaz.rs.gov.br`) e o retorno já utilizado por esse cliente:

```
br.gov.rs.procergs.mpbr://oauth/auth
```

Esta versão registra esse retorno no Android para o teste iniciado explicitamente pelo usuário. Isso pode conflitar com o aplicativo oficial MPBR: o Android pode apresentar uma escolha de aplicativo ou encaminhar o retorno ao aplicativo já definido como padrão. O piloto **não garante receber o retorno em todos os aparelhos/navegadores**. Ele recusa retornos sem tentativa ativa, com state diferente, duplicados ou vencidos, e não troca códigos de sessões iniciadas por outro aplicativo.

A tentativa e o verificador PKCE ficam temporariamente no armazenamento privado do APK por até 10 minutos; são consumidos antes da troca. O código é removido do Intent da Activity. O token recebido fica apenas na memória, sem gravação em banco, arquivo, logs ou conta do site. A memória é limpa ao apagar, vencer ou destruir a Activity. A rotação da tela ou encerramento do processo pode exigir novo teste. Não há renovação automática neste modo.

A requisição de token usa HTTPS, endpoint fixo, limite de resposta, timeout e nenhum redirecionamento HTTP. CPF e senha não passam pelo APK. O token só vai para a área de transferência após ação explícita.

Esse experimento reproduz o fluxo existente; não constitui homologação ou autorização de integração para distribuição em produção. Para escalar, alinhar com o MPBR uma integração suportada e um retorno próprio, preferencialmente Android App Links verificados.

## Outros botões

- **Testar apenas retorno ao aplicativo:** diagnóstico de navegador → APK usando o esquema próprio `br.com.precoperto.app`; não faz login gov.br nem gera token. Depende da página `/android` publicada.
- **Vincular à conta do site (outro fluxo):** mantém o fluxo anterior de vinculação por usuário, que exige entrar na conta Preço Perto e configurar um cliente autorizado para `br.com.precoperto.app://oauth/auth`. As variáveis `MPBR_ANDROID_CLIENT_ID` e `MPBR_ANDROID_REDIRECT_AUTHORIZED=true` referem-se somente a esse outro fluxo. Não são necessárias ao teste independente.
- **Abrir Preço Perto:** abre as pesquisas no navegador. O token obtido no teste independente não é vinculado automaticamente às pesquisas do site.

## Compilar e verificar

JDK 17+ e SDK Android Platform 34. Defina `JAVA_HOME` e `ANDROID_HOME` ou abra no Android Studio.

```powershell
.\gradlew.bat assembleDebug lintDebug
```

Saída: `app/build/outputs/apk/debug/app-debug.apk`. Na máquina de desenvolvimento foi usado o aapt2 já instalado no SDK como opção local de execução, sem gravar caminho pessoal na configuração do projeto.

Na raiz do repositório:

```powershell
node verify-android-pilot.mjs
```

Os testes Java verificam o desafio PKCE contra o vetor RFC 7636, geração independente, state, prazo, endereço e parâmetros duplicados. Os testes de API anteriores continuam cobrindo a vinculação ao site separadamente.

Para a instrumentação Android do modo independente, em emulador de teste:

```powershell
.\gradlew.bat -PpilotTestRunner=com.precoperto.piloto.StandaloneInstrumentation assembleDebug assembleDebugAndroidTest
adb -s <emulador-de-teste> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <emulador-de-teste> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <emulador-de-teste> shell am instrument -w com.precoperto.piloto.test/com.precoperto.piloto.StandaloneInstrumentation
```

Essa instrumentação bloqueia a abertura do navegador e simula a resposta MPBR dentro do processo de teste; não usa credenciais nem token real. Cobre a troca sem sessão do site, consumo único, validade do token, conteúdo sensível da cópia e limpeza. O teste anterior de retorno/vinculação usa `PilotInstrumentation` (runner padrão).

**Login real no gov.br ainda precisa ser validado pelo usuário no próprio celular.** Não foram usados CPF, senha ou token reais durante os testes automatizados.

Referências: [deep links Android](https://developer.android.com/training/app-links/create-deeplinks), [tratamento de clipboard sensível](https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling).
