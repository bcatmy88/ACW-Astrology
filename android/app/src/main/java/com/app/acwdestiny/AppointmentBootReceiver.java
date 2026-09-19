package com.app.acwdestiny;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AppointmentBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AppointmentBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String action = intent.getAction();
        Log.i(TAG, "Device rebooted or package replaced: " + action + ". Rescheduling appointment reminder alarm...");

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            AppointmentReminderScheduler.scheduleDailyReminder(context);
        }
    }
}
