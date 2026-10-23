package com.precoperto.piloto;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

/** Independent test using the same public client and callback as the supplied MPBR script. */
public final class NativeLogin {
    public static final String CLIENT_ID="p-mprs.sefaz.rs.gov.br";
    public static final String CALLBACK="br.gov.rs.procergs.mpbr://oauth/auth";
    private NativeLogin() {}
    public static final class Attempt {
        public final String state,verifier,url;
        public final long issuedAt;
        private Attempt(String state,String verifier,String url,long issuedAt) { this.state=state;this.verifier=verifier;this.url=url;this.issuedAt=issuedAt; }
    }
    private static String random(int count) { byte[] bytes=new byte[count];new SecureRandom().nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public static String challenge(String verifier) {
        try{return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));}
        catch(NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}
    }
    public static Attempt begin(long now) {
        String state=random(24),verifier=random(48),nonce=random(16);
        String url="https://sso.acesso.gov.br/authorize?response_type=code&client_id="+AuthLinks.encode(CLIENT_ID)+"&redirect_uri="+AuthLinks.encode(CALLBACK)+"&scope="+AuthLinks.encode("openid email profile govbr_confiabilidades")+"&state="+state+"&nonce="+nonce+"&code_challenge="+challenge(verifier)+"&code_challenge_method=S256";
        return new Attempt(state,verifier,url,now);
    }
    public static String code(String returned,String state,String verifier,long issuedAt,long now) {
        if(!AuthLinks.fresh(issuedAt,now)||!AuthLinks.validId(state)||verifier==null||!verifier.matches("[A-Za-z0-9_-]{43,128}"))throw new IllegalArgumentException("Inicie uma nova tentativa de login.");
        URI uri=AuthLinks.parse(returned);
        if(!"br.gov.rs.procergs.mpbr".equals(uri.getScheme())||!"oauth".equals(uri.getHost())||!"/auth".equals(uri.getPath()))throw new IllegalArgumentException("Retorno inesperado.");
        Map<String,String> query=AuthLinks.params(uri);
        if(!AuthLinks.matches(state,query.get("state")))throw new IllegalArgumentException("Este retorno não pertence ao teste atual.");
        if(query.containsKey("error"))throw new IllegalArgumentException("Login não concluído.");
        String code=query.get("code");
        if(code==null||code.isEmpty()||code.length()>10000||code.matches("(?s).*\\s.*")||code.contains("...")||code.contains("…"))throw new IllegalArgumentException("Código ausente ou incompleto.");
        return code;
    }
}
