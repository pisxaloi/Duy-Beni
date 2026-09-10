package com.pisxaloi.duybeni;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.List;

public class AlarmNotificationReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("AlarmReceiver", "AlarmNotificationReceiver triggered!");

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launchIntent.putExtra("alarmTriggered", true);
        launchIntent.putExtra("autoPlay", "true");

        // Uygulama aÃ§Ä±k mÄ± kontrol et
        if (!isAppOnForeground(context)) {
            // KapalÄ±ysa direkt baÅŸlat
            context.startActivity(launchIntent);
        } else {
            // AÃ§Ä±ksa intent gÃ¶nder
            context.startActivity(launchIntent);
        }
    }

    private boolean isAppOnForeground(Context context) {
        ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) return false;

        List<ActivityManager.RunningAppProcessInfo> appProcesses = activityManager.getRunningAppProcesses();
        if (appProcesses == null) return false;

        for (ActivityManager.RunningAppProcessInfo appProcess : appProcesses) {
            if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                    && appProcess.processName.equals(context.getPackageName())) {
                return true;
            }
        }
        return false;
    }
}
