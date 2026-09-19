package com.app.acwdestiny;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

public class AppointmentReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "AppointmentReminderReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "acwdestiny:AppointmentReminderWakeLock"
            );
            // Acquire with 5-second maximum safety timeout to strictly prevent battery drain
            wakeLock.acquire(5000);
        }

        try {
            String action = intent.getAction();
            Log.i(TAG, "AppointmentReminderReceiver triggered with action: " + action);

            if (AppointmentReminderScheduler.ACTION_EXACT_REMINDER.equals(action)) {
                String reminderId = intent.getStringExtra(AppointmentReminderScheduler.EXTRA_REMINDER_ID);
                String title = intent.getStringExtra(AppointmentReminderScheduler.EXTRA_TITLE);
                String body = intent.getStringExtra(AppointmentReminderScheduler.EXTRA_BODY);
                String extraData = intent.getStringExtra(AppointmentReminderScheduler.EXTRA_EXTRA_DATA);

                Log.i(TAG, "Firing exact appointment reminder for ID=" + reminderId + ", title=" + title);
                AppointmentReminderScheduler.showExactReminderNotification(context, reminderId, title, body, extraData);
            } else {
                // Default / Daily reminder alarm
                Log.i(TAG, "Firing daily appointment summary check...");
                AppointmentReminderScheduler.checkAndSendNotification(context);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing reminder broadcast", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                    Log.d(TAG, "WakeLock safely released");
                } catch (Exception e) {
                    Log.w(TAG, "Error releasing wakeLock", e);
                }
            }
        }
    }
}
