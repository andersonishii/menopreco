package com.precoperto.piloto;

import android.app.Activity;
import android.content.Intent;
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
        text(content,"ANDROID · PILOTO 0.1.1",12,true);
        text(content,"Protótipo de conexão",26,true);
        text(content,"O teste abaixo verifica a volta ao aplicativo. O login real do gov.br ainda depende da autorização do retorno para o Preço Perto; sem essa liberação, a tela de CPF e senha não será aberta.",16,false);
        button(content,"1. Testar retorno ao aplicativo",view -> begin("test"));
        button(content,"Verificar conexão com gov.br",view -> begin("connect"));
        button(content,"Abrir Preço Perto",view -> open(AuthLinks.SITE));
        status = text(content,"Aguardando um teste. Nenhuma conexão foi iniciada.",16,true);
        text(content,"O login ocorre no navegador do celular. Este piloto não acessa o console, não lê sua senha e não guarda tokens de acesso no aparelho.",14,false);
        handle(getIntent());
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent);setIntent(intent);handle(intent); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(LinearLayout parent,String value,int size,boolean bold) {
        TextView text = new TextView(this);text.setText(value);text.setTextSize(size);text.setTextColor(GREEN);text.setPadding(0,dp(10),0,dp(14));text.setLineSpacing(dp(3),1);
        if (bold) text.setTypeface(null,Typeface.BOLD);parent.addView(text);return text;
    }
    private void button(LinearLayout parent,String title,View.OnClickListener listener) {
        Button button = new Button(this);button.setText(title);button.setAllCaps(false);button.setTextSize(16);button.setPadding(dp(12),dp(12),dp(12),dp(12));button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1,-2);params.setMargins(0,dp(8),0,dp(8));parent.addView(button,params);
    }
    private void begin(String mode) {
        byte[] bytes = new byte[32];new SecureRandom().nextBytes(bytes);
        String request = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        flow.edit().clear().putString("request",request).putString("mode",mode).putString("phase","begin").putLong("issued",System.currentTimeMillis()).apply();
        status.setText(mode.equals("test") ? "No navegador, toque em Voltar ao aplicativo e concluir teste." : "Verifique no navegador: a conta do Preço Perto e a conexão gov.br são etapas diferentes.");
        open(AuthLinks.SITE+"/android?mode="+mode+"&request="+request);
    }
    private void open(String value) {
        try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (android.content.ActivityNotFoundException error) { status.setText("Instale ou habilite um navegador no celular para continuar."); }
    }
    private void handle(Intent intent) {
        Uri data = intent.getData();if(data == null)return;
        // Do not retain authorization codes in the Activity intent or saved state.
        intent.setData(null);
        try {
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
