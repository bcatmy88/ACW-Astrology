package com.app.acwdestiny;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;

@CapacitorPlugin(
    name = "AppointmentReminder",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class AppointmentReminderPlugin extends Plugin {
    private static final String TAG = "AppointmentReminderPlugin";

    @PluginMethod
    public void getReminderSettings(PluginCall call) {
        Context context = getContext();
        boolean enabled = AppointmentReminderScheduler.isReminderEnabled(context);
        String time = AppointmentReminderScheduler.getReminderTime(context);
        boolean leadTimeEnabled = AppointmentReminderScheduler.isLeadTimeEnabled(context);
        int leadTimeMinutes = AppointmentReminderScheduler.getLeadTimeMinutes(context);

        boolean hasPermission = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("time", time);
        ret.put("leadTimeEnabled", leadTimeEnabled);
        ret.put("leadTimeMinutes", leadTimeMinutes);
        ret.put("hasPermission", hasPermission);
        call.resolve(ret);
    }

    @PluginMethod
    public void setReminderSettings(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        String time = call.getString("time", "08:00");
        Boolean leadTimeEnabled = call.getBoolean("leadTimeEnabled", true);
        Integer leadTimeMinutes = call.getInt("leadTimeMinutes", 30);

        Context context = getContext();
        AppointmentReminderScheduler.saveSettings(context, enabled, time, leadTimeEnabled, leadTimeMinutes);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Reminder settings updated successfully");
        call.resolve(ret);
    }

    @PluginMethod
    public void syncAppointments(PluginCall call) {
        Context context = getContext();
        try {
            JSONArray appointmentsArr = call.getArray("appointments");
            String jsonStr = appointmentsArr != null ? appointmentsArr.toString() : "[]";
            AppointmentReminderScheduler.saveAppointments(context, jsonStr);

            int count = appointmentsArr != null ? appointmentsArr.length() : 0;
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("count", count);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error syncing appointments", e);
            call.reject("Failed to sync appointments: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    public void notificationPermissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void triggerTestNotification(PluginCall call) {
        Context context = getContext();
        try {
            int count = AppointmentReminderScheduler.checkAndSendNotification(context);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("count", count);
            ret.put("message", count > 0 
                ? "Notification sent with " + count + " appointment(s)." 
                : "No pending appointments found for today; notification skipped as per requirements.");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error triggering test notification", e);
            call.reject("Failed to trigger notification: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getNotificationLaunchData(PluginCall call) {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        boolean openAppointments = false;
        if (intent != null) {
            openAppointments = intent.getBooleanExtra(AppointmentReminderScheduler.EXTRA_OPEN_APPOINTMENTS, false);
            // Clear extra so subsequent calls don't repeatedly re-trigger
            intent.removeExtra(AppointmentReminderScheduler.EXTRA_OPEN_APPOINTMENTS);
        }
        JSObject ret = new JSObject();
        ret.put("openAppointments", openAppointments);
        call.resolve(ret);
    }
}
