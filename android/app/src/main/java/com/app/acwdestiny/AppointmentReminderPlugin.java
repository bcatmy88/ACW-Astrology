package com.app.acwdestiny;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

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
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        boolean hasNotification = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotification = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        boolean canExact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                canExact = alarmManager.canScheduleExactAlarms();
            }
        }

        boolean ignoringBattery = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                ignoringBattery = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }

        JSObject ret = new JSObject();
        ret.put("hasNotificationPermission", hasNotification);
        ret.put("canScheduleExactAlarms", canExact);
        ret.put("isIgnoringBatteryOptimizations", ignoringBattery);
        ret.put("androidVersion", Build.VERSION.SDK_INT);
        call.resolve(ret);
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
    public void openNotificationSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening notification settings", e);
            call.reject("Could not open notification settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Exact alarm settings not needed on this Android version (< Android 12)");
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error opening exact alarm settings", e);
            call.reject("Could not open exact alarm settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                } else {
                    intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                }
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening battery settings", e);
            call.reject("Could not open battery settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleReminder(PluginCall call) {
        String id = call.getString("id");
        Long timestamp = call.getLong("timestamp");
        String title = call.getString("title", "预约提醒 (Appointment Reminder)");
        String body = call.getString("body", "");
        String extraData = call.getString("extraData", "");

        if (id == null || id.isEmpty()) {
            call.reject("Reminder id is required");
            return;
        }
        if (timestamp == null || timestamp <= System.currentTimeMillis()) {
            call.reject("Valid future timestamp is required");
            return;
        }

        boolean success = AppointmentReminderScheduler.scheduleExactReminder(
                getContext(),
                id,
                timestamp,
                title,
                body,
                extraData
        );

        JSObject ret = new JSObject();
        ret.put("success", success);
        ret.put("id", id);
        ret.put("timestamp", timestamp);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelReminder(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Reminder id is required");
            return;
        }

        boolean success = AppointmentReminderScheduler.cancelExactReminder(getContext(), id);
        JSObject ret = new JSObject();
        ret.put("success", success);
        ret.put("id", id);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAllReminders(PluginCall call) {
        AppointmentReminderScheduler.cancelAllExactReminders(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getScheduledReminders(PluginCall call) {
        JSONArray arr = AppointmentReminderScheduler.getScheduledRemindersArray(getContext());
        try {
            JSArray jsArr = new JSArray(arr.toString());
            JSObject ret = new JSObject();
            ret.put("reminders", jsArr);
            ret.put("count", arr.length());
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("reminders", new JSArray());
            ret.put("count", 0);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void scheduleTestReminder(PluginCall call) {
        int seconds = call.getInt("seconds", 60);
        long triggerAt = System.currentTimeMillis() + (seconds * 1000L);
        String testId = "test_reminder_" + System.currentTimeMillis();
        String title = "⏰ 预约提醒测试 (Appointment Test)";
        String body = "这是一条精确定时锁屏提醒！设置时间：" + seconds + " 秒前。Native AlarmManager 与高优先级锁屏通知已正常生效！";

        boolean success = AppointmentReminderScheduler.scheduleExactReminder(
                getContext(),
                testId,
                triggerAt,
                title,
                body,
                "{\"isTest\":true}"
        );

        JSObject ret = new JSObject();
        ret.put("success", success);
        ret.put("testId", testId);
        ret.put("triggerAt", triggerAt);
        ret.put("seconds", seconds);
        ret.put("message", "已成功向 Android AlarmManager 注册 " + seconds + " 秒后的锁屏精确闹钟！现在您可以锁屏手机进行测试。");
        call.resolve(ret);
    }

    @PluginMethod
    public void triggerTestNotification(PluginCall call) {
        Context context = getContext();
        try {
            String testId = "instant_test_" + System.currentTimeMillis();
            String title = "🔔 阿赞旺预约提醒测试 (High Priority)";
            String body = "您已成功触发 Android 原生高优先级提醒（包含振动与金色提示光）。状态栏与锁屏界面均可展示。";

            AppointmentReminderScheduler.showExactReminderNotification(context, testId, title, body, "{\"isTest\":true}");

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "测试通知已通过高优先级通道直接发送到系统通知中心！");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error triggering test notification", e);
            call.reject("Failed to trigger notification: " + e.getMessage());
        }
    }

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

            int scheduledCount = 0;
            boolean reminderEnabled = AppointmentReminderScheduler.isReminderEnabled(context);
            boolean leadTimeEnabled = AppointmentReminderScheduler.isLeadTimeEnabled(context);
            int leadTimeMinutes = AppointmentReminderScheduler.getLeadTimeMinutes(context);

            long now = System.currentTimeMillis();

            if (reminderEnabled && appointmentsArr != null) {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
                SimpleDateFormat dateOnlySdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());

                for (int i = 0; i < appointmentsArr.length(); i++) {
                    JSONObject apt = appointmentsArr.getJSONObject(i);
                    String id = apt.optString("id");
                    String date = apt.optString("date");
                    String time = apt.optString("time");
                    String status = apt.optString("status", "Pending");
                    String clientName = apt.optString("clientName", "客户");

                    // Only schedule for Pending appointments
                    if (!"Pending".equalsIgnoreCase(status) || id.isEmpty() || date.isEmpty()) {
                        AppointmentReminderScheduler.cancelExactReminder(context, id);
                        continue;
                    }

                    long targetTimestamp = 0;
                    try {
                        if (time != null && !time.isEmpty()) {
                            Date aptDate = sdf.parse(date + " " + time);
                            if (aptDate != null) {
                                targetTimestamp = aptDate.getTime();
                            }
                        } else {
                            Date aptDate = dateOnlySdf.parse(date);
                            if (aptDate != null) {
                                // Default to 09:00 on the day
                                targetTimestamp = aptDate.getTime() + (9 * 3600 * 1000L);
                            }
                        }
                    } catch (Exception pe) {
                        Log.w(TAG, "Error parsing appointment date/time: " + date + " " + time);
                    }

                    // Apply lead time if configured (e.g. 30 minutes before)
                    long notifyTimestamp = targetTimestamp;
                    if (leadTimeEnabled && leadTimeMinutes > 0) {
                        notifyTimestamp = targetTimestamp - (leadTimeMinutes * 60 * 1000L);
                    }

                    if (notifyTimestamp > now) {
                        String title = "⏰ 预约提醒 (Appointment Reminder)";
                        String body = "您与 " + clientName + " 的预约将于 " + (time != null && !time.isEmpty() ? time : "今日") + " 进行，请及时准备。";
                        boolean ok = AppointmentReminderScheduler.scheduleExactReminder(
                                context,
                                id,
                                notifyTimestamp,
                                title,
                                body,
                                apt.toString()
                        );
                        if (ok) scheduledCount++;
                    } else {
                        // Already past, cancel
                        AppointmentReminderScheduler.cancelExactReminder(context, id);
                    }
                }
            }

            // Also ensure daily morning reminder is scheduled
            AppointmentReminderScheduler.scheduleDailyReminder(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("syncedCount", appointmentsArr != null ? appointmentsArr.length() : 0);
            ret.put("scheduledExactCount", scheduledCount);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error syncing appointments", e);
            call.reject("Failed to sync appointments: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getNotificationLaunchData(PluginCall call) {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        boolean openAppointments = false;
        String reminderId = null;
        if (intent != null) {
            openAppointments = intent.getBooleanExtra(AppointmentReminderScheduler.EXTRA_OPEN_APPOINTMENTS, false);
            reminderId = intent.getStringExtra("reminder_id");
            intent.removeExtra(AppointmentReminderScheduler.EXTRA_OPEN_APPOINTMENTS);
        }
        JSObject ret = new JSObject();
        ret.put("openAppointments", openAppointments);
        if (reminderId != null) {
            ret.put("reminderId", reminderId);
        }
        call.resolve(ret);
    }
}
