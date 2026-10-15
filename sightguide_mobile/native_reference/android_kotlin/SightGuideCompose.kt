package com.sightguide.app

import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.content.Intent
import android.os.Vibrator
import android.os.VibrationEffect
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.util.Locale

// Obsidian Dark Theme Colors
val BgDark = Color(0xFF0A0E17)
val BgSurface = Color(0xFF131B2E)
val AccentCyan = Color(0xFF00D2FF)
val AccentAmber = Color(0xFFFFAA00)
val AccentHazard = Color(0xFFFF3B30)

enum class NavMode { DESCRIBE, READ, FIND }

data class TranscriptItem(
    val speaker: String,
    val text: String,
    val isHazard: Boolean = false
)

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {
    private lateinit var tts: TextToSpeech
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var vibrator: Vibrator

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator

        setContent {
            SightGuideApp(
                onSpeak = { text -> speak(text) },
                onListen = { startListening() },
                onVibrate = { pattern -> triggerVibration(pattern) }
            )
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale.US
            speak("SightGuide ready. Tap anywhere or say describe, read, or find washroom.")
        }
    }

    private fun speak(text: String) {
        tts.stop() // Immediate interruption
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "sightguide_tts")
    }

    private fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US)
        }
        speechRecognizer.startListening(intent)
    }

    private fun triggerVibration(pattern: LongArray) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            vibrator.vibrate(pattern, -1)
        }
    }
}

@Composable
fun SightGuideApp(
    onSpeak: (String) -> Unit,
    onListen: () -> Unit,
    onVibrate: (LongArray) -> Unit
) {
    var mode by remember { mutableStateOf(NavMode.DESCRIBE) }
    var obstaclesEnabled by remember { mutableStateOf(false) }
    var isScanning by remember { mutableStateOf(false) }
    val transcript = remember { mutableStateListOf<TranscriptItem>() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "SightGuide",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Surface(
                color = AccentCyan.copy(alpha = 0.2f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = if (isScanning) "Scanning" else "Ready",
                    color = AccentCyan,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Camera Preview Reticle (Placeholder for Android CameraX PreviewView)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp)
                .background(Color.Black, RoundedCornerShape(16.dp))
                .border(2.dp, if (isScanning) AccentCyan else Color(0xFF1F2D4A), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("CameraX Feed Reticle (640px JPEG Downscaler)", color = Color.White)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Live Transcript List
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(BgSurface, RoundedCornerShape(12.dp))
                .padding(12.dp)
        ) {
            items(transcript) { item ->
                Text(
                    text = "${item.speaker}: ${item.text}",
                    color = if (item.isHazard) AccentHazard else Color.White,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Big Mic Push-to-Talk Button
        Box(
            modifier = Modifier
                .size(72.dp)
                .align(Alignment.CenterHorizontally)
                .background(AccentCyan, CircleShape)
                .clickable { onListen() },
            contentAlignment = Alignment.Center
        ) {
            Text("🎙️", fontSize = 32.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Accessible Action Grid (min 64dp height)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = {
                    mode = NavMode.DESCRIBE
                    onSpeak("Describing scene...")
                    onVibrate(longArrayOf(0, 40))
                },
                modifier = Modifier.weight(1f).height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BgSurface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("👁️ Describe", color = Color.White, fontSize = 16.sp)
            }
            Button(
                onClick = {
                    mode = NavMode.READ
                    onSpeak("Reading sign...")
                    onVibrate(longArrayOf(0, 40))
                },
                modifier = Modifier.weight(1f).height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BgSurface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("📖 Read Sign", color = Color.White, fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = {
                    mode = NavMode.FIND
                    isScanning = true
                    onSpeak("Finding washroom. Slowly turn left.")
                    onVibrate(longArrayOf(0, 70, 50, 90))
                },
                modifier = Modifier.weight(1f).height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BgSurface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("🚻 Find Washroom", color = AccentCyan, fontSize = 15.sp)
            }
            Button(
                onClick = {
                    obstaclesEnabled = !obstaclesEnabled
                    val msg = if (obstaclesEnabled) "Obstacle warnings enabled." else "Obstacle warnings disabled."
                    onSpeak(msg)
                },
                modifier = Modifier.weight(1f).height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = if (obstaclesEnabled) AccentHazard.copy(alpha = 0.3f) else BgSurface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("⚠️ Obstacles", color = AccentHazard, fontSize = 15.sp)
            }
        }
    }
}
