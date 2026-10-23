package com.precoperto.piloto;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.os.PersistableBundle;
import android.os.Handler;
import android.os.Looper;
import java.util.Date;
import java.text.DateFormat;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

public final class MainActivity extends Activity {
    private SharedPreferences flow;
    private TextView status;
    private Button copyToken;
    private TokenExchange.Result token;
    private int generation=0;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final Handler expiryHandler=new Handler(Looper.getMainLooper());
    private static final int GREEN = Color.rgb(23,108,73);
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        flow = getSharedPreferences("pending-flow",MODE_PRIVATE);
        getWindow().setStatusBarColor(GREEN);
        getWindow().setNavigationBarColor(Color.rgb(245,248,242));
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(24),dp(40),dp(24),dp(32));
        content.setBackgroundColor(Color.rgb(245,248,242));scroll.addView(content);setContentView(scroll);
        text(content,"preço perto",32,true);
        text(content,"ANDROID · PILOTO 0.2.0",12,true);
        text(content,"Teste seu login gov.br",26,true);
        text(content,"Teste o login gov.br e a obtenção do token sem entrar na conta do Preço Perto. O login abre no navegador oficial do celular.",16,false);
        status = text(content,"Aguardando um teste. Nenhuma conexão foi iniciada.",16,true);
        button(content,"Testar login gov.br (sem conta do site)",view -> beginStandalone());
        copyToken=button(content,"Copiar token obtido",view -> copyToken());copyToken.setEnabled(false);
        button(content,"Apagar token do teste",view -> {generation++;flow.edit().clear().apply();discardToken();status.setText("Token removido da memória do aplicativo.");});
        text(content,"Se o Android perguntar qual aplicativo deve receber o retorno, escolha Preço Perto Piloto para este teste. O aplicativo oficial MPBR pode receber o retorno se já estiver definido como padrão.",14,false);
        button(content,"Testar apenas retorno ao aplicativo",view -> begin("test"));
        button(content,"Vincular à conta do site (outro fluxo)",view -> begin("connect"));
        button(content,"Abrir Preço Perto",view -> open(AuthLinks.SITE));
        text(content,"O CPF e a senha são digitados somente no gov.br. O token fica na memória até ser apagado, vencer ou o aplicativo ser encerrado. Ele só é copiado quando você toca em Copiar token obtido.",14,false);
        handle(getIntent());
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent);setIntent(intent);handle(intent); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(LinearLayout parent,String value,int size,boolean bold) {
        TextView text = new TextView(this);text.setText(value);text.setTextSize(size);text.setTextColor(GREEN);text.setPadding(0,dp(10),0,dp(14));text.setLineSpacing(dp(3),1);
        if (bold) text.setTypeface(null,Typeface.BOLD);parent.addView(text);return text;
    }
    private Button button(LinearLayout parent,String title,View.OnClickListener listener) {
        Button button = new Button(this);button.setText(title);button.setAllCaps(false);button.setTextSize(16);button.setPadding(dp(12),dp(12),dp(12),dp(12));button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1,-2);params.setMargins(0,dp(8),0,dp(8));parent.addView(button,params);return button;
    }
    private void begin(String mode) {
        generation++;discardToken();
        byte[] bytes = new byte[32];new SecureRandom().nextBytes(bytes);
        String request = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        flow.edit().clear().putString("request",request).putString("mode",mode).putString("phase","begin").putLong("issued",System.currentTimeMillis()).apply();
        status.setText(mode.equals("test") ? "No navegador, toque em Voltar ao aplicativo e concluir teste." : "Verifique no navegador: a conta do Preço Perto e a conexão gov.br são etapas diferentes.");
        open(AuthLinks.SITE+"/android?mode="+mode+"&request="+request);
    }
    private void discardToken() { token=null;if(copyToken!=null)copyToken.setEnabled(false);expiryHandler.removeCallbacksAndMessages(null); }
    private void beginStandalone() {
        generation++;discardToken();NativeLogin.Attempt attempt=NativeLogin.begin(System.currentTimeMillis());
        flow.edit().clear().putString("mode","standalone").putString("phase","login").putString("state",attempt.state).putString("verifier",attempt.verifier).putLong("issued",attempt.issuedAt).apply();
        status.setText("Entre no gov.br no navegador. Se o Android pedir, escolha Preço Perto Piloto para receber o retorno desta tentativa.");
        open(attempt.url);
    }
    private void copyToken() {
        if(token==null||token.expiresAt<=System.currentTimeMillis()){discardToken();status.setText("Nenhum token válido. Inicie um novo teste de login.");return;}
        ClipData clip=tokenClip(token.accessToken);
        ((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(clip);
        status.setText("Token copiado. Validade: "+DateFormat.getDateTimeInstance().format(new Date(token.expiresAt))+". Este teste não vinculou o token à conta do site.");
    }
    static ClipData tokenClip(String value) {
        ClipData clip=ClipData.newPlainText("Token MPBR",value);
        PersistableBundle extras=new PersistableBundle();extras.putBoolean("android.content.extra.IS_SENSITIVE",true);clip.getDescription().setExtras(extras);
        return clip;
    }
    private void receiveStandalone(String returned) {
        String verifier=flow.getString("verifier","");
        String code=NativeLogin.code(returned,flow.getString("state",""),verifier,flow.getLong("issued",0),System.currentTimeMillis());
        if(!flow.getString("phase","").equals("login"))throw new IllegalArgumentException("Retorno já usado.");
        // Consume the attempt before the network call. Never persist the authorization code or token.
        flow.edit().clear().apply();
        status.setText("Login recebido. Trocando o código pelo token…");
        final int currentGeneration=generation;
        worker.execute(()->{
            try{
                TokenExchange.Result result=TokenExchange.exchange(code,verifier);
                runOnUiThread(()->{if(isDestroyed()||isFinishing()||currentGeneration!=generation)return;discardToken();token=result;copyToken.setEnabled(true);status.setText("Token obtido! Validade: "+DateFormat.getDateTimeInstance().format(new Date(result.expiresAt))+". Você pode copiá-lo pelo botão acima. Nenhum login no Preço Perto foi necessário.");expiryHandler.postDelayed(()->{discardToken();status.setText("O token venceu. Inicie um novo teste de login.");},Math.max(1,result.expiresAt-System.currentTimeMillis()));});
            }catch(Exception error){runOnUiThread(()->{if(!isDestroyed()&&!isFinishing()&&currentGeneration==generation)status.setText("Não foi possível obter o token. O código pode ter expirado ou o serviço estar indisponível. Inicie um novo teste.");});}
        });
    }
    @Override protected void onDestroy() { discardToken();worker.shutdownNow();super.onDestroy(); }
    private void open(String value) {
        try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (android.content.ActivityNotFoundException error) { status.setText("Instale ou habilite um navegador no celular para continuar."); }
    }
    private void handle(Intent intent) {
        Uri data = intent.getData();if(data == null)return;
        // Do not retain authorization codes in the Activity intent or saved state.
        intent.setData(null);
        try {
            if(flow.getString("mode","").equals("standalone")){receiveStandalone(data.toString());return;}
            URI uri = AuthLinks.parse(data.toString());String path = AuthLinks.path(uri);Map<String,String> query = AuthLinks.params(uri);
            if (!AuthLinks.fresh(flow.getLong("issued",0),System.currentTimeMillis())) throw new IllegalArgumentException("A tentativa expirou. Toque no botão para começar novamente.");
            String mode = flow.getString("mode",""),phase = flow.getString("phase","");
            if (path.equals("/test")) {
                if (!mode.equals("test") || !phase.equals("begin") || !AuthLinks.matches(flow.getString("request",""),query.get("request"))) throw new IllegalArgumentException("Este teste não pertence à tentativa atual.");
                flow.edit().clear().apply();status.setText("Teste concluído! O navegador voltou ao aplicativo. Este teste não fez login no gov.br.");return;
            }
            if (!mode.equals("connect")) throw new IllegalArgumentException("Inicie uma conexão pelo aplicativo.");
            if (path.equals("/start")) {
                if (!phase.equals("begin") || !AuthLinks.matches(flow.getString("request",""),query.get("request"))) throw new IllegalArgumentException("Esta conexão não foi iniciada pelo aplicativo.");
                URI auth = AuthLinks.authorize(query.get("url"));
                flow.edit().putString("state",AuthLinks.params(auth).get("state")).putString("phase","login").apply();
                status.setText("Aguardando o gov.br. Após entrar, o navegador deverá voltar a este aplicativo.");open(auth.toString());return;
            }
            if (!AuthLinks.matches(flow.getString("state",""),query.get("state"))) throw new IllegalArgumentException("O retorno não pertence à tentativa atual.");
            if(path.equals("/complete")) {
                if (!phase.equals("finishing")) throw new IllegalArgumentException("Conclua a conexão no navegador.");
                flow.edit().clear().apply();status.setText("Conexão concluída no site. Abra o Preço Perto para pesquisar com sua conta.");return;
            }
            if (!phase.equals("login")) throw new IllegalArgumentException("Este retorno já foi recebido. Inicie novamente.");
            if (query.containsKey("error")) throw new IllegalArgumentException("A autorização não foi concluída no gov.br. Tente novamente.");
            String code = query.get("code");
            if (code == null || code.trim().isEmpty() || code.length() > 10000 || code.matches(".*\\s.*")) throw new IllegalArgumentException("Código de retorno ausente ou incompleto.");
            flow.edit().putString("phase","finishing").apply();
            status.setText("Retorno recebido. Conclua a conexão no navegador; a autorização ficará salva no servidor.");
            open(AuthLinks.SITE+"/android#callback="+AuthLinks.encode(uri.toString()));
        } catch (IllegalArgumentException error) { status.setText(error.getMessage() == null ? "Retorno inválido. Inicie novamente." : "Não foi possível continuar. Inicie novamente pelo botão do aplicativo."); }
    }
}
