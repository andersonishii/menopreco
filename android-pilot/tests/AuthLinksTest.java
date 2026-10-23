import com.precoperto.piloto.AuthLinks;
import com.precoperto.piloto.NativeLogin;
import java.net.URI;
public final class AuthLinksTest {
    static void check(boolean value) { if(!value)throw new AssertionError(); }
    static void rejects(Runnable action) { try{action.run();}catch(IllegalArgumentException expected){return;}throw new AssertionError("Must reject invalid input"); }
    public static void main(String[] args) {
        String state="A".repeat(32),challenge="B".repeat(43);
        String valid="https://sso.acesso.gov.br/authorize?response_type=code&client_id=authorized-client&redirect_uri="+AuthLinks.encode(AuthLinks.CALLBACK)+"&state="+state+"&code_challenge_method=S256&code_challenge="+challenge;
        check(AuthLinks.authorize(valid).getHost().equals("sso.acesso.gov.br"));
        check(AuthLinks.path(AuthLinks.parse(AuthLinks.CALLBACK+"?state="+state)).equals("/auth"));
        check(AuthLinks.matches(state,state));check(!AuthLinks.matches(state,"wrong"));check(!AuthLinks.matches("",""));
        check(AuthLinks.fresh(1000,2000));check(!AuthLinks.fresh(1000,601000));check(!AuthLinks.fresh(2000,1000));
        check(AuthLinks.validId(state));check(!AuthLinks.validId("invalid id"));
        rejects(()->AuthLinks.authorize(valid.replace("https://","http://")));
        rejects(()->AuthLinks.authorize(valid.replace("sso.acesso.gov.br","sso.acesso.gov.br.evil.example")));
        rejects(()->AuthLinks.authorize(valid.replace("sso.acesso.gov.br","evil.example@sso.acesso.gov.br")));
        rejects(()->AuthLinks.authorize(valid.replace("sso.acesso.gov.br","sso.acesso.gov.br:444")));
        rejects(()->AuthLinks.authorize(valid.replace(AuthLinks.encode(AuthLinks.CALLBACK),AuthLinks.encode("br.gov.rs.procergs.mpbr://oauth/auth"))));
        rejects(()->AuthLinks.authorize(valid+"&state=duplicate"));
        rejects(()->AuthLinks.authorize(valid+"&%73tate=duplicate"));
        rejects(()->AuthLinks.authorize(valid+"#fragment"));
        rejects(()->AuthLinks.authorize(valid.replace("S256","plain")));
        rejects(()->AuthLinks.path(AuthLinks.parse("br.gov.rs.procergs.mpbr://oauth/auth?state="+state)));
        rejects(()->AuthLinks.path(AuthLinks.parse("br.com.precoperto.app://oauth/unknown")));
        rejects(()->AuthLinks.params(URI.create(AuthLinks.CALLBACK+"?code=first&code=second")));
        NativeLogin.Attempt first=NativeLogin.begin(1000),second=NativeLogin.begin(1000);
        check(!first.state.equals(second.state));check(!first.verifier.equals(second.verifier));
        java.util.Map<String,String> parameters=AuthLinks.params(URI.create(first.url));
        check(parameters.get("client_id").equals(NativeLogin.CLIENT_ID));
        check(parameters.get("redirect_uri").equals(NativeLogin.CALLBACK));
        check(parameters.get("code_challenge").equals(NativeLogin.challenge(first.verifier)));
        check(NativeLogin.challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk").equals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"));
        String callback=NativeLogin.CALLBACK+"?code=fake-test-code&state="+first.state;
        check(NativeLogin.code(callback,first.state,first.verifier,1000,2000).equals("fake-test-code"));
        rejects(()->NativeLogin.code(callback,second.state,first.verifier,1000,2000));
        rejects(()->NativeLogin.code(callback,first.state,first.verifier,1000,601000));
        rejects(()->NativeLogin.code(callback,first.state,"invalid-verifier",1000,2000));
        rejects(()->NativeLogin.code(callback+"&code=duplicate",first.state,first.verifier,1000,2000));
        rejects(()->NativeLogin.code(callback+"&state=duplicate",first.state,first.verifier,1000,2000));
        rejects(()->NativeLogin.code(callback.replace("fake-test-code","..."),first.state,first.verifier,1000,2000));
        rejects(()->NativeLogin.code(callback.replace("br.gov.rs.procergs.mpbr","evil.app"),first.state,first.verifier,1000,2000));
        rejects(()->NativeLogin.code(callback+"&error=access_denied",first.state,first.verifier,1000,2000));
        System.out.println("PASS: standalone login generates independent PKCE, matches RFC 7636, validates state and consumes only complete current callbacks.");
        System.out.println("PASS: Android validates origin, own callback, PKCE, state, expiry and duplicate parameters.");
    }
}
