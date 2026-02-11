import { useRouter } from 'expo-router';
import React from 'react';

import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const router = useRouter();


export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { }}>
          <Text style={styles.icon}>✖️</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => { }}>
            <Text style={styles.icon}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { }}>
            <Text style={styles.icon}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleEmoji}>🚌</Text>
        <Text style={styles.title}>VoiceNav</Text>
      </View>

      <Text style={styles.subtitle}>
        Navigate Buses Independently
      </Text>

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanContainer}
        onPress={() => router.push('/camera')}
      >
        <View style={styles.cameraCircle}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>

        <Text style={styles.scanTitle}>SCAN BUS NOW</Text>
        <Text style={styles.scanSub}>(TAP TO ACTIVATE)</Text>
      </TouchableOpacity>

      {/* Sample Images Button */}
      <TouchableOpacity
        style={styles.sampleButton}
        onPress={() => Alert.alert('Gallery coming soon!')}
      >
        <Text style={{ fontWeight: '600' }}>
          🖼 TEST WITH SAMPLE IMAGES
        </Text>
      </TouchableOpacity>

      {/* Route Assistant Button */}
      <TouchableOpacity
        style={styles.routeButton}
        onPress={() => Alert.alert('Route assistant coming soon!')}
      >
        <Text style={styles.routeText}>
          🔥 ROUTE ASSISTANT
        </Text>
      </TouchableOpacity>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Last Scanned Info */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.lastScanned}>
          LAST SCANNED: BUS 401
        </Text>
        <Text style={styles.time}>
          Time: 2:30 PM
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 22,
    marginHorizontal: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  titleEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: 'grey',
    marginTop: 8,
    marginBottom: 40,
  },
  scanContainer: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  cameraCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#2196F3',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 32,
    color: 'white',
  },
  scanTitle: {
    marginTop: 20,
    fontWeight: 'bold',
    fontSize: 18,
  },
  scanSub: {
    fontSize: 12,
    color: 'grey',
  },
  sampleButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  routeButton: {
    marginTop: 20,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
  },
  routeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastScanned: {
    fontSize: 12,
    color: 'grey',
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: 'grey',
  },
});
