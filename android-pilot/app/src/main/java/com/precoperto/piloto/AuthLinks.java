package com.precoperto.piloto;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

/** No credentials or tokens: validate the browser handoff and the current attempt only. */
public final class AuthLinks {
    public static final String SITE = "https://menopreco-1.onrender.com";
    public static final String CALLBACK = "br.com.precoperto.app://oauth/auth";
    private AuthLinks() {}
    public static URI parse(String value) {
        if (value == null || value.length() > 16000) throw new IllegalArgumentException("Retorno inválido.");
        URI uri = URI.create(value);
        if (uri.getUserInfo() != null || uri.getPort() != -1 || uri.getRawFragment() != null) throw new IllegalArgumentException("Retorno inválido.");
        return uri;
    }
    public static Map<String,String> params(URI uri) {
        Map<String,String> values = new HashMap<>();
        String query = uri.getRawQuery();
        if (query == null) return values;
        for (String item : query.split("&")) {
            String[] pair = item.split("=",2);
            String key = decode(pair[0]);
            String value = pair.length > 1 ? decode(pair[1]) : "";
            if (values.put(key,value) != null) throw new IllegalArgumentException("Parâmetro duplicado.");
        }
        return values;
    }
    public static String path(URI uri) {
        if (!"br.com.precoperto.app".equals(uri.getScheme()) || !"oauth".equals(uri.getHost())) throw new IllegalArgumentException("O retorno não pertence ao Preço Perto.");
        String path = uri.getPath();
        if (!java.util.Arrays.asList("/test","/start","/auth","/complete").contains(path)) throw new IllegalArgumentException("Retorno desconhecido.");
        return path;
    }
    public static boolean matches(String expected, String actual) {
        return expected != null && actual != null && !expected.isEmpty() && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),actual.getBytes(StandardCharsets.UTF_8));
    }
    public static boolean fresh(long issuedAt,long now) { return issuedAt > 0 && now >= issuedAt && now - issuedAt < 600000; }
    public static URI authorize(String value) {
        URI uri = parse(value);
        Map<String,String> query = params(uri);
        if (!"https".equals(uri.getScheme()) || !"sso.acesso.gov.br".equals(uri.getHost()) || !"/authorize".equals(uri.getPath())
                || !CALLBACK.equals(query.get("redirect_uri")) || !"code".equals(query.get("response_type")) || !"S256".equals(query.get("code_challenge_method"))
                || !validId(query.get("state")) || query.getOrDefault("client_id","").trim().isEmpty() || !query.getOrDefault("code_challenge","").matches("[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException("Endereço de autorização inválido. Recomece pelo aplicativo.");
        return uri;
    }
    private static String decode(String value) { try { return URLDecoder.decode(value,"UTF-8"); } catch (java.io.UnsupportedEncodingException impossible) { throw new IllegalStateException(impossible); } }
    public static boolean validId(String value) { return value != null && value.matches("[A-Za-z0-9_-]{32,128}"); }
    public static String encode(String value) { try { return URLEncoder.encode(value,"UTF-8"); } catch (java.io.UnsupportedEncodingException impossible) { throw new IllegalStateException(impossible); } }
}
