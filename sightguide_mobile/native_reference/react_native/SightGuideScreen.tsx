import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Vibration,
  SafeAreaView,
} from 'react-native';
import Tts from 'react-native-tts';
import Voice from '@react-native-voice/voice';

// Obsidian Dark Theme
const COLORS = {
  bgDark: '#0A0E17',
  bgSurface: '#131B2E',
  borderDark: '#1F2D4A',
  accentCyan: '#00D2FF',
  accentAmber: '#FFAA00',
  accentHazard: '#FF3B30',
  textLight: '#FFFFFF',
  textMuted: '#94A3B8',
};

export const SightGuideScreen = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [obstaclesEnabled, setObstaclesEnabled] = useState(false);
  const [transcript, setTranscript] = useState([
    {
      id: '1',
      speaker: 'SYSTEM',
      text: 'SightGuide ready. Tap anywhere or say describe, read, or find washroom.',
      isHazard: false,
    },
  ]);

  useEffect(() => {
    Tts.setDefaultRate(0.5);
    Tts.speak('SightGuide ready. Tap anywhere or say describe, read, or find washroom.');

    return () => {
      Tts.stop();
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const speak = (text: string) => {
    Tts.stop(); // Immediate interruption
    Tts.speak(text);
  };

  const handleDescribe = () => {
    Vibration.vibrate(40);
    speak('Describing scene...');
  };

  const handleRead = () => {
    Vibration.vibrate(40);
    speak('Reading sign...');
  };

  const handleFindWashroom = () => {
    setIsScanning(true);
    Vibration.vibrate([0, 70, 50, 90]);
    speak('Finding washroom. Slowly turn left.');
  };

  const toggleObstacles = () => {
    const nextState = !obstaclesEnabled;
    setObstaclesEnabled(nextState);
    const msg = nextState
      ? 'Obstacle warnings enabled. Remember, this is an aid and does not replace your cane.'
      : 'Obstacle warnings disabled.';
    speak(msg);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandLetter}>S</Text>
          </View>
          <Text style={styles.brandTitle}>SightGuide</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{isScanning ? 'Scanning' : 'Ready'}</Text>
        </View>
      </View>

      {/* Camera Reticle Viewport */}
      <View style={[styles.viewport, isScanning && styles.viewportScanning]}>
        <Text style={styles.viewportText}>Camera Feed Reticle (640px JPEG Downscaler)</Text>
      </View>

      {/* Transcript Log */}
      <ScrollView style={styles.transcriptBox}>
        {transcript.map((item) => (
          <View key={item.id} style={styles.transcriptRow}>
            <Text style={[styles.speakerTag, item.isHazard && styles.hazardTag]}>
              [{item.speaker}]
            </Text>
            <Text style={styles.transcriptText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Center Mic Button */}
      <TouchableOpacity
        style={styles.micButton}
        activeOpacity={0.8}
        onPress={() => speak('Listening for commands...')}
      >
        <Text style={styles.micIcon}>🎙️</Text>
      </TouchableOpacity>

      {/* Accessible Action Grid (min 64dp height) */}
      <View style={styles.actionGrid}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDescribe}>
            <Text style={styles.actionBtnText}>👁️ Describe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRead}>
            <Text style={styles.actionBtnText}>📖 Read Sign</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cyanBtn]}
            onPress={handleFindWashroom}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.accentCyan }]}>
              🚻 Find Washroom
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              obstaclesEnabled && { backgroundColor: 'rgba(255, 59, 48, 0.2)' },
            ]}
            onPress={toggleObstacles}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.accentHazard }]}>
              ⚠️ Obstacles
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  brandLetter: { color: COLORS.accentCyan, fontSize: 20, fontWeight: 'bold' },
  brandTitle: { color: COLORS.textLight, fontSize: 22, fontWeight: 'bold' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
    borderRadius: 12,
  },
  statusText: { color: COLORS.accentCyan, fontWeight: 'bold', fontSize: 12 },
  viewport: {
    height: 200,
    backgroundColor: '#000',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  viewportScanning: { borderColor: COLORS.accentCyan, borderWidth: 2 },
  viewportText: { color: COLORS.textMuted, fontSize: 12 },
  transcriptBox: {
    maxHeight: 120,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  transcriptRow: { marginBottom: 6 },
  speakerTag: { color: COLORS.accentCyan, fontSize: 11, fontWeight: 'bold' },
  hazardTag: { color: COLORS.accentHazard },
  transcriptText: { color: COLORS.textLight, fontSize: 13 },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentCyan,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.accentCyan,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  micIcon: { fontSize: 32 },
  actionGrid: { gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cyanBtn: { borderColor: COLORS.accentCyan },
  actionBtnText: { color: COLORS.textLight, fontSize: 15, fontWeight: 'bold' },
});
