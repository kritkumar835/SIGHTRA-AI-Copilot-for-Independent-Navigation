package com.sightguide.sightguide_mobile

import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import kotlin.math.sqrt

class MainActivity : FlutterActivity(), SensorEventListener {
    private val CHANNEL = "com.drishtiai.app/system_events"
    private var methodChannel: MethodChannel? = null

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var lastShakeTime: Long = 0
    private var launchedViaPowerButton: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Allow app to wake and display over lock screen when user triggers double power-click
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        checkLaunchIntent(intent)
        setupShakeDetector()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        checkLaunchIntent(intent)
    }

    private fun checkLaunchIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        if (action == "android.media.action.STILL_IMAGE_CAMERA" ||
            action == "android.media.action.STILL_IMAGE_CAMERA_SECURE" ||
            action == "android.media.action.IMAGE_CAPTURE" ||
            action == Intent.ACTION_CAMERA_BUTTON) {
            launchedViaPowerButton = true
            methodChannel?.invokeMethod("onPowerButtonDoubleTap", true)
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "checkPowerLaunch" -> {
                    val wasPower = launchedViaPowerButton
                    launchedViaPowerButton = false
                    result.success(wasPower)
                }
                else -> result.notImplemented()
            }
        }

        if (launchedViaPowerButton) {
            methodChannel?.invokeMethod("onPowerButtonDoubleTap", true)
        }
    }

    private fun setupShakeDetector() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }

    override fun onResume() {
        super.onResume()
        accelerometer?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
    }

    override fun onPause() {
        super.onPause()
        sensorManager?.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            val gX = x / SensorManager.GRAVITY_EARTH
            val gY = y / SensorManager.GRAVITY_EARTH
            val gZ = z / SensorManager.GRAVITY_EARTH

            val gForce = sqrt((gX * gX + gY * gY + gZ * gZ).toDouble()).toFloat()

            // Threshold for shake detection (gForce > 2.4g indicating intentional shake gesture)
            if (gForce > 2.4f) {
                val now = System.currentTimeMillis()
                // Debounce consecutive shakes by 1500ms
                if (now - lastShakeTime > 1500) {
                    lastShakeTime = now
                    runOnUiThread {
                        methodChannel?.invokeMethod("onDeviceShaked", true)
                    }
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}
