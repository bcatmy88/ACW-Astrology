package com.app.acwdestiny;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppointmentReminderPlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure notification channel is registered and scheduled alarms are active
        AppointmentReminderScheduler.createNotificationChannel(this);
        AppointmentReminderScheduler.restoreAllScheduledReminders(this);

        handleNotificationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra(AppointmentReminderScheduler.EXTRA_OPEN_APPOINTMENTS, false)) {
            // Tapping notification opens the app to the Appointment dashboard
            // Deep-link / hash fallback in WebView
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('open_appointments_view', { detail: { date: '" 
                            + intent.getStringExtra("target_date") + "' } }));", 
                            null
                        );
                    }
                });
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
    }
}
