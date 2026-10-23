package com.precoperto.piloto;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.ClipboardManager;
import android.content.ClipData;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import java.net.URL;
import java.net.URLStreamHandler;
import java.net.URLConnection;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicInteger;
import javax.net.ssl.HttpsURLConnection;
import java.security.cert.Certificate;

/** Test-only transport. No browser page, government login or real token is used. */
public final class StandaloneInstrumentation extends Instrumentation {
    private static final AtomicInteger exchanges=new AtomicInteger();
    private static volatile String exchangedForm="";
    private static final class FakeConnection extends HttpsURLConnection {
        private final ByteArrayOutputStream sent=new ByteArrayOutputStream();
        FakeConnection(URL url){super(url);}
        @Override public void connect(){}
        @Override public void disconnect(){}
        @Override public boolean usingProxy(){return false;}
        @Override public String getCipherSuite(){return "test-only";}
        @Override public Certificate[] getLocalCertificates(){return null;}
        @Override public Certificate[] getServerCertificates(){return null;}
        @Override public OutputStream getOutputStream(){return sent;}
        @Override public int getResponseCode(){
            check(getURL().toString().equals("https://mprs.sefaz.rs.gov.br/API/ConsultaMenorPrecoBrasil/api/v1/Login/token"),"Fixed MPBR endpoint");
            check(getRequestMethod().equals("POST"),"POST exchange");
            check(getRequestProperty("Cookie")==null,"No site session needed");
            check(!getInstanceFollowRedirects(),"Never forward codes through redirects");
            exchangedForm=new String(sent.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);exchanges.incrementAndGet();return 200;
        }
        @Override public InputStream getInputStream(){return new ByteArrayInputStream("{\"access_token\":\"synthetic-token-for-instrumentation\",\"expires_in\":3600}".getBytes(java.nio.charset.StandardCharsets.UTF_8));}
    }
    @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    private static void rejectsToken(String value,long now){try{TokenExchange.parse(value,now);}catch(Exception expected){return;}throw new AssertionError("Invalid token response must be rejected");}
    private static Button find(View view,String label){
        if(view instanceof Button&&((Button)view).getText().toString().equals(label))return (Button)view;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){Button result=find(group.getChildAt(i),label);if(result!=null)return result;}}
        return null;
    }
    private static boolean hasText(View view,String value){
        if(view instanceof android.widget.TextView&&((android.widget.TextView)view).getText().toString().contains(value))return true;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)if(hasText(group.getChildAt(i),value))return true;}
        return false;
    }
    @Override public void onStart(){
        Bundle results=new Bundle();
        try{
            IntentFilter browser=new IntentFilter(Intent.ACTION_VIEW);browser.addDataScheme("https");
            addMonitor(browser,new ActivityResult(Activity.RESULT_CANCELED,null),true);
            URL.setURLStreamHandlerFactory(protocol->protocol.equals("https")?new URLStreamHandler(){@Override protected URLConnection openConnection(URL url){return new FakeConnection(url);}}:null);
            MainActivity activity=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            for(int i=0;i<50&&!activity.hasWindowFocus();i++){waitForIdleSync();android.os.SystemClock.sleep(20);}
            SharedPreferences flow=getTargetContext().getSharedPreferences("pending-flow",0);
            runOnMainSync(()->find(activity.getWindow().getDecorView(),"Testar login gov.br (sem conta do site)").performClick());
            check(flow.getString("mode","").equals("standalone"),"No site account dependency");
            String state=flow.getString("state",""),verifier=flow.getString("verifier","");
            check(AuthLinks.validId(state)&&verifier.length()>=43,"Local PKCE created");
            runOnMainSync(()->activity.onNewIntent(new Intent(Intent.ACTION_VIEW,Uri.parse(NativeLogin.CALLBACK+"?code=fake-code&state=wrong"))));
            check(exchanges.get()==0&&flow.contains("verifier"),"Reject unrelated callback without consuming current attempt");
            Intent returned=new Intent(Intent.ACTION_VIEW,Uri.parse(NativeLogin.CALLBACK+"?code=fake-code&state="+state));
            runOnMainSync(()->activity.onNewIntent(returned));
            check(returned.getData()==null,"Remove code from Activity intent");
            long deadline=android.os.SystemClock.uptimeMillis()+5000;
            while(exchanges.get()==0&&android.os.SystemClock.uptimeMillis()<deadline)android.os.SystemClock.sleep(20);
            for(int i=0;i<20;i++){waitForIdleSync();android.os.SystemClock.sleep(20);}
            check(exchanges.get()==1,"Single token exchange");
            java.util.Map<String,String> form=AuthLinks.params(java.net.URI.create("https://test.invalid/?"+exchangedForm));
            check(form.get("code_verifier").equals(verifier)&&form.get("code").equals("fake-code"),"Current verifier and code");
            check(form.get("redirect_uri").equals(NativeLogin.CALLBACK),"Preserve registered return");
            check(flow.getAll().isEmpty(),"Consume attempt and never persist token");
            runOnMainSync(()->check(find(activity.getWindow().getDecorView(),"Copiar token obtido").isEnabled(),"Copy enabled after success"));
            runOnMainSync(()->activity.onNewIntent(new Intent(Intent.ACTION_VIEW,Uri.parse(NativeLogin.CALLBACK+"?code=fake-code&state="+state))));
            check(exchanges.get()==1,"Reject replay");
            runOnMainSync(()->find(activity.getWindow().getDecorView(),"Copiar token obtido").performClick());
            runOnMainSync(()->{
                ClipboardManager clipboard=(ClipboardManager)activity.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
                check(hasText(activity.getWindow().getDecorView(),"Token copiado."),"Copy action completes for a valid token");
                // Test the exact clip factory used by the button, without relying on
                // Android's foreground-only clipboard read access for instrumentation.
                ClipData clip=MainActivity.tokenClip("synthetic-token-for-instrumentation");check(clip.getItemAt(0).getText().toString().equals("synthetic-token-for-instrumentation"),"Copy requested token only");
                check(clip.getDescription().getExtras().getBoolean("android.content.extra.IS_SENSITIVE"),"Sensitive clipboard flag");clipboard.clearPrimaryClip();
                find(activity.getWindow().getDecorView(),"Apagar token do teste").performClick();check(!find(activity.getWindow().getDecorView(),"Copiar token obtido").isEnabled(),"Forget token on request");
            });
            check(TokenExchange.parse("{\"access_token\":\"opaque\",\"expires_in\":60}",1000).expiresAt==61000,"Opaque token lifetime");
            rejectsToken("{\"access_token\":12,\"expires_in\":60}",1000);rejectsToken("{\"access_token\":\"opaque\"}",1000);rejectsToken("{\"access_token\":\"opaque\",\"expires_in\":-1}",1000);
            String expiredJwt="header."+java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"exp\":1}".getBytes(java.nio.charset.StandardCharsets.UTF_8))+".signature";
            rejectsToken("{\"access_token\":\""+expiredJwt+"\",\"expires_in\":60}",2000);
            results.putString("stream","PASS: standalone without site account, PKCE, state, one-time exchange, token lifetime, sensitive clipboard and memory cleanup. Browser blocked and MPBR response mocked; no real gov.br login.\n");
            finish(Activity.RESULT_OK,results);
        }catch(Throwable error){results.putString("stream","FAIL: "+error.getClass().getSimpleName()+": "+error.getMessage()+"\n");finish(Activity.RESULT_CANCELED,results);}
    }
}
