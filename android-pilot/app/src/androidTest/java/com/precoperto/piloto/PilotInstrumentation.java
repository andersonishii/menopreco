package com.precoperto.piloto;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

/** Runs against the pilot only, with synthetic callbacks. Does not log into gov.br. */
public final class PilotInstrumentation extends Instrumentation {
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments);start(); }
    private static void check(boolean value,String message) { if(!value)throw new AssertionError(message); }
    private static Button find(View view,String label) {
        if(view instanceof Button && ((Button)view).getText().toString().equals(label))return (Button)view;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){Button result=find(group.getChildAt(i),label);if(result!=null)return result;}}
        return null;
    }
    private static boolean hasText(View view,String text) {
        if(view instanceof TextView && ((TextView)view).getText().toString().contains(text))return true;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)if(hasText(group.getChildAt(i),text))return true;}
        return false;
    }
    @Override public void onStart() {
        Bundle results=new Bundle();
        try{
            MainActivity activity=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            SharedPreferences flow=getTargetContext().getSharedPreferences("pending-flow",0);
            runOnMainSync(()->find(activity.getWindow().getDecorView(),"1. Testar retorno ao aplicativo").performClick());
            String id=flow.getString("request","");check(AuthLinks.validId(id),"App must create a random request");
            runOnMainSync(()->activity.onNewIntent(new Intent(Intent.ACTION_VIEW,Uri.parse("br.com.precoperto.app://oauth/test?request=wrong"))));
            check(flow.contains("request"),"Wrong callback must not finish flow");
            runOnMainSync(()->activity.onNewIntent(new Intent(Intent.ACTION_VIEW,Uri.parse("br.com.precoperto.app://oauth/test?request="+id))));
            check(!flow.contains("request"),"Valid callback must consume flow");
            runOnMainSync(()->check(hasText(activity.getWindow().getDecorView(),"Teste concluído!"),"Show successful diagnostic only"));
            runOnMainSync(()->activity.onNewIntent(new Intent(Intent.ACTION_VIEW,Uri.parse("br.com.precoperto.app://oauth/test?request="+id))));
            check(!flow.contains("request"),"Replayed callback cannot restore flow");
            check(getTargetContext().getPackageManager().resolveActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(AuthLinks.CALLBACK+"?state=test")).setPackage(getTargetContext().getPackageName()),0)!=null,"Manifest must resolve own callback");
            check(getTargetContext().getPackageManager().resolveActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("br.gov.rs.procergs.mpbr://oauth/auth?state=test")).setPackage(getTargetContext().getPackageName()),0)==null,"Must not register official app scheme");
            runOnMainSync(()->find(activity.getWindow().getDecorView(),"2. Conectar com gov.br").performClick());
            check(flow.getString("mode","").equals("connect"),"Connect mode must be separate from diagnostic");
            flow.edit().clear().commit();
            results.putString("stream","PASS: launch, buttons, random attempt, wrong/replayed callback, own manifest scheme and separate login mode. Synthetic callbacks; no gov.br login.\n");
            finish(Activity.RESULT_OK,results);
        }catch(Throwable error){results.putString("stream","FAIL: "+error.getClass().getSimpleName()+": "+error.getMessage()+"\n");finish(Activity.RESULT_CANCELED,results);}
    }
}
