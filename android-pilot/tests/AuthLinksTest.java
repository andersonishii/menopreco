import com.precoperto.piloto.AuthLinks;
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
        System.out.println("PASS: Android validates origin, own callback, PKCE, state, expiry and duplicate parameters.");
    }
}
