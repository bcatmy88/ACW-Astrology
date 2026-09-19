package com.app.acwdestiny;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AppointmentReminderScheduler {
    private static final String TAG = "AppointmentReminder";

    public static final String PREFS_NAME = "appointment_reminder_prefs";
    public static final String KEY_ENABLED = "reminder_enabled";
    public static final String KEY_TIME = "reminder_time"; // e.g., "08:00"
    public static final String KEY_LEAD_TIME_ENABLED = "reminder_lead_time_enabled";
    public static final String KEY_LEAD_TIME_MINUTES = "reminder_lead_time_minutes"; // e.g. 15, 30, 60, 120
    public static final String KEY_APPOINTMENTS_JSON = "appointments_json";
    public static final String KEY_EXACT_REMINDERS_JSON = "exact_scheduled_reminders_json";

    public static final String CHANNEL_ID = "appointment_reminders";
    public static final String CHANNEL_NAME = "Appointment Reminders";
    public static final String ACTION_DAILY_REMINDER = "com.app.acwdestiny.ACTION_DAILY_REMINDER";
    public static final String ACTION_EXACT_REMINDER = "com.app.acwdestiny.ACTION_EXACT_REMINDER";
    public static final String EXTRA_OPEN_APPOINTMENTS = "open_appointments";
    public static final String EXTRA_REMINDER_ID = "reminder_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_EXTRA_DATA = "extra_data";
    public static final String EXTRA_TIMESTAMP = "timestamp";

    public static final int REQUEST_CODE_DAILY_ALARM = 9001;
    public static final int NOTIFICATION_ID_DAILY = 1001;

    public static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static boolean isReminderEnabled(Context context) {
        return getPrefs(context).getBoolean(KEY_ENABLED, true);
    }

    public static String getReminderTime(Context context) {
        return getPrefs(context).getString(KEY_TIME, "08:00");
    }

    public static boolean isLeadTimeEnabled(Context context) {
        return getPrefs(context).getBoolean(KEY_LEAD_TIME_ENABLED, true);
    }

    public static int getLeadTimeMinutes(Context context) {
        return getPrefs(context).getInt(KEY_LEAD_TIME_MINUTES, 30);
    }

    public static void saveSettings(Context context, boolean enabled, String time, boolean leadTimeEnabled, int leadTimeMinutes) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_ENABLED, enabled);
        if (time != null && !time.isEmpty()) {
            editor.putString(KEY_TIME, time);
        }
        editor.putBoolean(KEY_LEAD_TIME_ENABLED, leadTimeEnabled);
        editor.putInt(KEY_LEAD_TIME_MINUTES, leadTimeMinutes);
        editor.apply();

        if (enabled) {
            scheduleDailyReminder(context);
        } else {
            cancelDailyReminder(context);
        }
    }

    public static void saveAppointments(Context context, String appointmentsJson) {
        if (appointmentsJson == null) return;
        getPrefs(context).edit().putString(KEY_APPOINTMENTS_JSON, appointmentsJson).apply();
    }

    /**
     * Create the high-priority Notification Channel with sound, vibration, lights, and lockscreen visibility (Android 8.0+)
     */
    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("阿赞旺命理系统：预约到期准时提醒与每日待办通知");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableLights(true);
            channel.setLightColor(Color.rgb(212, 175, 55)); // Gold accent
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 300, 200, 300});

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (defaultSoundUri != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build();
                channel.setSound(defaultSoundUri, audioAttributes);
            }

            notificationManager.createNotificationChannel(channel);
        }
    }

    public static int getRequestCodeForId(String id) {
        if (id == null) return 10000;
        return 10000 + Math.abs(id.hashCode() % 1000000);
    }

    /**
     * Schedule an exact native alarm for an individual appointment.
     * Uses AlarmManager.setExactAndAllowWhileIdle() to wake the CPU and trigger even during Doze/Lock screen.
     */
    public static boolean scheduleExactReminder(Context context, String id, long triggerAtMillis, String title, String body, String extraData) {
        if (context == null || id == null || id.isEmpty()) return false;
        long now = System.currentTimeMillis();
        if (triggerAtMillis <= now) {
            Log.w(TAG, "Cannot schedule reminder in the past: " + triggerAtMillis + " <= " + now);
            return false;
        }

        createNotificationChannel(context);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager service not available");
            return false;
        }

        Intent intent = new Intent(context, AppointmentReminderReceiver.class);
        intent.setAction(ACTION_EXACT_REMINDER);
        intent.putExtra(EXTRA_REMINDER_ID, id);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_BODY, body);
        intent.putExtra(EXTRA_EXTRA_DATA, extraData);
        intent.putExtra(EXTRA_TIMESTAMP, triggerAtMillis);

        int requestCode = getRequestCodeForId(id);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Cancel previous alarm if any
        alarmManager.cancel(pendingIntent);

        boolean scheduled = false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                        scheduled = true;
                    } else {
                        Log.w(TAG, "Exact alarm restricted on Android 12+, using setAndAllowWhileIdle fallback");
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                        scheduled = true;
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                    scheduled = true;
                }
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                scheduled = true;
            }
            Log.i(TAG, "Successfully scheduled exact alarm for ID=" + id + " at " + new Date(triggerAtMillis));
        } catch (SecurityException se) {
            Log.w(TAG, "SecurityException scheduling exact alarm, falling back to setAndAllowWhileIdle", se);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                    scheduled = true;
                }
            } catch (Exception ex) {
                Log.e(TAG, "Failed fallback alarm scheduling", ex);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling exact alarm", e);
        }

        if (scheduled) {
            // Persist reminder record to SharedPreferences
            saveScheduledReminderRecord(context, id, triggerAtMillis, title, body, extraData);
        }

        return scheduled;
    }

    /**
     * Cancel an exact scheduled alarm by ID
     */
    public static boolean cancelExactReminder(Context context, String id) {
        if (context == null || id == null || id.isEmpty()) return false;
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AppointmentReminderReceiver.class);
            intent.setAction(ACTION_EXACT_REMINDER);

            int requestCode = getRequestCodeForId(id);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (alarmManager != null && pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }

            removeScheduledReminderRecord(context, id);
            Log.i(TAG, "Cancelled exact alarm for ID=" + id);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling exact reminder for ID=" + id, e);
            return false;
        }
    }

    /**
     * Cancel all exact scheduled alarms
     */
    public static void cancelAllExactReminders(Context context) {
        if (context == null) return;
        try {
            JSONArray arr = getScheduledRemindersArray(context);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String id = obj.optString("id");
                if (!id.isEmpty() && alarmManager != null) {
                    Intent intent = new Intent(context, AppointmentReminderReceiver.class);
                    intent.setAction(ACTION_EXACT_REMINDER);
                    int requestCode = getRequestCodeForId(id);
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context,
                            requestCode,
                            intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                    );
                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                    }
                }
            }
            getPrefs(context).edit().putString(KEY_EXACT_REMINDERS_JSON, "[]").apply();
            Log.i(TAG, "Cancelled all scheduled exact reminders");
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all exact reminders", e);
        }
    }

    private static synchronized void saveScheduledReminderRecord(Context context, String id, long timestamp, String title, String body, String extraData) {
        try {
            JSONArray arr = getScheduledRemindersArray(context);
            JSONArray updated = new JSONArray();
            // Remove existing with same id if any
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                if (!id.equals(item.optString("id"))) {
                    updated.put(item);
                }
            }

            JSONObject newObj = new JSONObject();
            newObj.put("id", id);
            newObj.put("timestamp", timestamp);
            newObj.put("title", title);
            newObj.put("body", body);
            newObj.put("extraData", extraData);
            updated.put(newObj);

            getPrefs(context).edit().putString(KEY_EXACT_REMINDERS_JSON, updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving scheduled reminder record", e);
        }
    }

    private static synchronized void removeScheduledReminderRecord(Context context, String id) {
        try {
            JSONArray arr = getScheduledRemindersArray(context);
            JSONArray updated = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                if (!id.equals(item.optString("id"))) {
                    updated.put(item);
                }
            }
            getPrefs(context).edit().putString(KEY_EXACT_REMINDERS_JSON, updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error removing reminder record", e);
        }
    }

    public static JSONArray getScheduledRemindersArray(Context context) {
        String json = getPrefs(context).getString(KEY_EXACT_REMINDERS_JSON, "[]");
        try {
            return new JSONArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /**
     * Restore and re-register all scheduled alarms on reboot or app start.
     */
    public static void restoreAllScheduledReminders(Context context) {
        if (context == null) return;
        Log.i(TAG, "Restoring all scheduled reminders after reboot/start...");
        createNotificationChannel(context);

        // 1. Restore daily morning reminder
        scheduleDailyReminder(context);

        // 2. Restore individual exact appointment alarms
        long now = System.currentTimeMillis();
        try {
            JSONArray arr = getScheduledRemindersArray(context);
            JSONArray surviving = new JSONArray();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String id = obj.optString("id");
                long timestamp = obj.optLong("timestamp", 0);
                String title = obj.optString("title", "预约提醒");
                String body = obj.optString("body", "");
                String extra = obj.optString("extraData", "");

                if (timestamp > now) {
                    // Re-register with AlarmManager
                    boolean ok = scheduleExactReminder(context, id, timestamp, title, body, extra);
                    if (ok) {
                        surviving.put(obj);
                    }
                }
            }

            getPrefs(context).edit().putString(KEY_EXACT_REMINDERS_JSON, surviving.toString()).apply();
            Log.i(TAG, "Restored " + surviving.length() + " future appointment reminders");
        } catch (Exception e) {
            Log.e(TAG, "Error restoring scheduled reminders", e);
        }
    }

    /**
     * Display the exact appointment notification on lock screen with sound, vibration, and gold light.
     */
    public static void showExactReminderNotification(Context context, String reminderId, String title, String body, String extraData) {
        if (context == null) return;

        createNotificationChannel(context);

        // Check Android 13+ POST_NOTIFICATIONS permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted, cannot display notification.");
                return;
            }
        }

        // Prepare Intent to open Appointment Dashboard when tapped
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra(EXTRA_OPEN_APPOINTMENTS, true);
        openIntent.putExtra("reminder_id", reminderId);
        openIntent.putExtra("extra_data", extraData);

        int requestCode = getRequestCodeForId(reminderId);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                requestCode,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int smallIcon = context.getApplicationInfo().icon != 0 
                ? context.getApplicationInfo().icon 
                : android.R.drawable.ic_lock_idle_alarm;

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(smallIcon)
                .setContentTitle(title != null && !title.isEmpty() ? title : "预约提醒 (Appointment Reminder)")
                .setContentText(body != null && !body.isEmpty() ? body : "您有即将到来的命理预约，请及时查看。")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 300, 200, 300})
                .setLights(Color.rgb(212, 175, 55), 1000, 500)
                .setContentIntent(contentIntent);

        int notificationId = getRequestCodeForId(reminderId);

        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build());
            Log.i(TAG, "Posted exact appointment notification ID=" + reminderId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to post exact notification", e);
        }

        // Clean up completed reminder from active list
        removeScheduledReminderRecord(context, reminderId);
    }

    /**
     * Schedule the daily morning reminder alarm (e.g. 08:00 AM)
     */
    public static void scheduleDailyReminder(Context context) {
        if (!isReminderEnabled(context)) {
            cancelDailyReminder(context);
            return;
        }

        createNotificationChannel(context);

        String timeStr = getReminderTime(context);
        int hour = 8;
        int minute = 0;
        try {
            String[] parts = timeStr.split(":");
            hour = Integer.parseInt(parts[0]);
            minute = Integer.parseInt(parts[1]);
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse time string: " + timeStr, e);
        }

        Calendar now = Calendar.getInstance();
        Calendar target = Calendar.getInstance();
        target.set(Calendar.HOUR_OF_DAY, hour);
        target.set(Calendar.MINUTE, minute);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        if (target.getTimeInMillis() <= now.getTimeInMillis()) {
            target.add(Calendar.DAY_OF_YEAR, 1);
        }

        long triggerAtMillis = target.getTimeInMillis();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, AppointmentReminderReceiver.class);
        intent.setAction(ACTION_DAILY_REMINDER);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE_DAILY_ALARM,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.cancel(pendingIntent);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                }
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }
            Log.i(TAG, "Scheduled daily reminder alarm for: " + target.getTime().toString());
        } catch (SecurityException se) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling daily alarm", e);
        }
    }

    public static void cancelDailyReminder(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AppointmentReminderReceiver.class);
            intent.setAction(ACTION_DAILY_REMINDER);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE_DAILY_ALARM,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (alarmManager != null && pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling daily reminder alarm", e);
        }
    }

    /**
     * Check today's appointments and send daily notification if count > 0.
     */
    public static int checkAndSendNotification(Context context) {
        if (!isReminderEnabled(context)) {
            return 0;
        }

        createNotificationChannel(context);

        String todayDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        String appointmentsJson = getPrefs(context).getString(KEY_APPOINTMENTS_JSON, "[]");

        List<JSONObject> todayList = new ArrayList<>();

        try {
            JSONArray arr = new JSONArray(appointmentsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String date = obj.optString("date", "");
                String status = obj.optString("status", "Pending");

                if (todayDate.equals(date) && "Pending".equalsIgnoreCase(status)) {
                    todayList.add(obj);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing appointments JSON", e);
        }

        Collections.sort(todayList, new Comparator<JSONObject>() {
            @Override
            public int compare(JSONObject a, JSONObject b) {
                String timeA = a.optString("time", "99:99");
                String timeB = b.optString("time", "99:99");
                return timeA.compareTo(timeB);
            }
        });

        int count = todayList.size();

        if (count == 0) {
            Log.i(TAG, "No pending appointments scheduled for today (" + todayDate + "). Notification skipped.");
            scheduleDailyReminder(context);
            return 0;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted");
                scheduleDailyReminder(context);
                return 0;
            }
        }

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra(EXTRA_OPEN_APPOINTMENTS, true);
        openIntent.putExtra("target_date", todayDate);

        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                NOTIFICATION_ID_DAILY,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = "今日预约提醒 (Today's Appointments)";
        String summary = "您今天有 " + count + " 个待办预约 (You have " + count + " appointment(s) today.)";

        NotificationCompat.InboxStyle inboxStyle = new NotificationCompat.InboxStyle();
        inboxStyle.setBigContentTitle(title);
        inboxStyle.setSummaryText(count + " 项今日预约");

        for (JSONObject apt : todayList) {
            String time = apt.optString("time", "");
            String clientName = apt.optString("clientName", "客户");
            String displayTime = time.isEmpty() ? "全天" : time;

            JSONArray services = apt.optJSONArray("services");
            String serviceSnippet = "";
            if (services != null && services.length() > 0) {
                serviceSnippet = " · " + services.optString(0);
            }

            inboxStyle.addLine(displayTime + " — " + clientName + serviceSnippet);
        }

        int smallIcon = context.getApplicationInfo().icon != 0 
                ? context.getApplicationInfo().icon 
                : android.R.drawable.ic_menu_my_calendar;

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(summary)
                .setStyle(inboxStyle)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 300, 200, 300})
                .setLights(Color.rgb(212, 175, 55), 1000, 500)
                .setContentIntent(contentIntent);

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_DAILY, builder.build());
            Log.i(TAG, "Successfully posted daily appointment notification with " + count + " item(s).");
        } catch (Exception e) {
            Log.e(TAG, "Failed to post notification", e);
        }

        scheduleDailyReminder(context);
        return count;
    }
}
