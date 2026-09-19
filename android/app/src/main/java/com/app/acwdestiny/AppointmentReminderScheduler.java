package com.app.acwdestiny;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
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

    public static final String CHANNEL_ID = "daily_appointments_channel";
    public static final String ACTION_DAILY_REMINDER = "com.app.acwdestiny.ACTION_DAILY_REMINDER";
    public static final String EXTRA_OPEN_APPOINTMENTS = "open_appointments";

    public static final int REQUEST_CODE_ALARM = 9001;
    public static final int REQUEST_CODE_NOTIFICATION = 9002;
    public static final int NOTIFICATION_ID = 1001;

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

    public static void saveSettings(Context context, boolean enabled, String time) {
        saveSettings(context, enabled, time, isLeadTimeEnabled(context), getLeadTimeMinutes(context));
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
     * Create the Notification Channel for normal daily reminders (Android 8.0+)
     */
    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "今日预约提醒 (Daily Appointments)";
            String description = "每日早晨自动提醒今日待办预约";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;

            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(false);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Schedule the daily reminder alarm at the configured time.
     * Prevents duplicate alarms by using FLAG_UPDATE_CURRENT and cancelling prior alarms.
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

        // If time already passed today, schedule for tomorrow
        if (target.getTimeInMillis() <= now.getTimeInMillis()) {
            target.add(Calendar.DAY_OF_YEAR, 1);
        }

        long triggerAtMillis = target.getTimeInMillis();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.w(TAG, "AlarmManager not available");
            return;
        }

        Intent intent = new Intent(context, AppointmentReminderReceiver.class);
        intent.setAction(ACTION_DAILY_REMINDER);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE_ALARM,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Cancel previous pending alarm to avoid duplicates
        alarmManager.cancel(pendingIntent);

        // Schedule reliable wake-up alarm that survives phone lock and doze mode
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
            Log.i(TAG, "Scheduled daily appointment reminder for: " + target.getTime().toString());
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm permission restricted, falling back to setAndAllowWhileIdle", se);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
        }
    }

    /**
     * Cancel the scheduled daily reminder alarm
     */
    public static void cancelDailyReminder(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AppointmentReminderReceiver.class);
            intent.setAction(ACTION_DAILY_REMINDER);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE_ALARM,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (alarmManager != null && pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
                Log.i(TAG, "Cancelled daily appointment reminder alarm");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling reminder alarm", e);
        }
    }

    /**
     * Core routine called when the alarm fires:
     * 1. Read today's appointments from local storage
     * 2. If 0 appointments, do NOT send any notification
     * 3. If >= 1 appointments, build and display the native Android notification
     * 4. Reschedule for tomorrow
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

                // Check if appointment is for today and still pending
                if (todayDate.equals(date) && "Pending".equalsIgnoreCase(status)) {
                    todayList.add(obj);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing appointments JSON", e);
        }

        // Sort by time
        Collections.sort(todayList, new Comparator<JSONObject>() {
            @Override
            public int compare(JSONObject a, JSONObject b) {
                String timeA = a.optString("time", "99:99");
                String timeB = b.optString("time", "99:99");
                return timeA.compareTo(timeB);
            }
        });

        int count = todayList.size();

        // Requirement: If there are NO appointments today, do not send a notification!
        if (count == 0) {
            Log.i(TAG, "No pending appointments scheduled for today (" + todayDate + "). Notification skipped.");
            // Reschedule for next day
            scheduleDailyReminder(context);
            return 0;
        }

        // Check Android 13+ POST_NOTIFICATIONS permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted, cannot display notification.");
                scheduleDailyReminder(context);
                return 0;
            }
        }

        // Prepare Intent to open Appointment Dashboard when tapped
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra(EXTRA_OPEN_APPOINTMENTS, true);
        openIntent.putExtra("target_date", todayDate);

        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                REQUEST_CODE_NOTIFICATION,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = "今日预约提醒 (Today's Appointments)";
        String summary = "您今天有 " + count + " 个预约安排 (You have " + count + " appointments today.)";

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

        // Use standard app icon or calendar icon
        int smallIcon = context.getApplicationInfo().icon != 0 
                ? context.getApplicationInfo().icon 
                : android.R.drawable.ic_menu_my_calendar;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(summary)
                .setStyle(inboxStyle)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
            Log.i(TAG, "Successfully posted daily appointment notification with " + count + " item(s).");
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException posting notification", se);
        } catch (Exception e) {
            Log.e(TAG, "Failed to post notification", e);
        }

        // Schedule next alarm for tomorrow
        scheduleDailyReminder(context);
        return count;
    }
}
