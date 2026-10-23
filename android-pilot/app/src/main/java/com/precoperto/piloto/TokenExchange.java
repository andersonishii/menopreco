package com.precoperto.piloto;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

/** Tokens are returned to this Activity's memory only. No site login, cookies or database. */
public final class TokenExchange {
    private static final String ENDPOINT="https://mprs.sefaz.rs.gov.br/API/ConsultaMenorPrecoBrasil/api/v1/Login/token";
    private TokenExchange() {}
    public static final class Result {
        public final String accessToken;
        public final long expiresAt;
        Result(String accessToken,long expiresAt) { this.accessToken=accessToken;this.expiresAt=expiresAt; }
    }
    static String form(String code,String verifier) {
        return "grant_type=authorization_code&code="+AuthLinks.encode(code)+"&client_id="+AuthLinks.encode(NativeLogin.CLIENT_ID)+"&redirect_uri="+AuthLinks.encode(NativeLogin.CALLBACK)+"&ambiente=Producao&code_verifier="+AuthLinks.encode(verifier);
    }
    static Result parse(String body,long now) throws Exception {
        if(body.length()>65536)throw new IllegalArgumentException("Resposta muito grande.");
        JSONObject data=new JSONObject(body);Object token=data.opt("access_token");
        if(!(token instanceof String)||((String)token).isEmpty()||((String)token).length()>50000)throw new IllegalArgumentException("Token inválido.");
        double seconds=data.optDouble("expires_in",Double.NaN);
        long expires=Double.isFinite(seconds)&&seconds>0&&seconds<315360000?now+(long)(seconds*1000):Long.MAX_VALUE;
        try{
            String[] parts=((String)token).split("\\.");
            JSONObject claims=new JSONObject(new String(Base64.getUrlDecoder().decode(parts[1]),StandardCharsets.UTF_8));
            double exp=claims.optDouble("exp",Double.NaN);if(Double.isFinite(exp)&&exp>0&&exp<Long.MAX_VALUE/1000.0)expires=Math.min(expires,(long)(exp*1000));
        }catch(Exception ignored){/* Access tokens may be opaque. Use expires_in when provided. */}
        if(expires==Long.MAX_VALUE||expires<=now)throw new IllegalArgumentException("Validade do token inválida.");
        return new Result((String)token,expires);
    }
    public static Result exchange(String code,String verifier) throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL(ENDPOINT).openConnection();
        try{
            connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);connection.setConnectTimeout(25000);connection.setReadTimeout(25000);
            connection.setRequestMethod("POST");connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("Cache-Control","no-store");connection.setRequestProperty("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
            byte[] body=form(code,verifier).getBytes(StandardCharsets.UTF_8);connection.setDoOutput(true);connection.setFixedLengthStreamingMode(body.length);
            try(OutputStream output=connection.getOutputStream()){output.write(body);}
            if(connection.getResponseCode()!=200)throw new IllegalStateException("O serviço não concluiu a troca. Inicie um novo teste.");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                byte[] chunk=new byte[4096];int count;
                while((count=input.read(chunk))!=-1){if(output.size()+count>65536)throw new IllegalArgumentException("Resposta muito grande.");output.write(chunk,0,count);}
                return parse(new String(output.toByteArray(),StandardCharsets.UTF_8),System.currentTimeMillis());
            }
        }finally{connection.disconnect();}
    }
}
