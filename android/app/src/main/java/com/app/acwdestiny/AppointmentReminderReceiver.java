package com.app.acwdestiny;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AppointmentReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "AppointmentReminderReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Alarm triggered! Checking today's appointments for daily reminder...");
        if (context != null) {
            AppointmentReminderScheduler.checkAndSendNotification(context);
        }
    }
}
