import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';

import { extractRouteFromVoice, voiceRecognition, VoiceRecognitionResult } from '@/services/voiceRecognitionService';
import {
  Modal,
  PanResponder,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import {
  getBusArrivalTimes,
  getNearbyRoutes,
  startRouteTracking,
  type BusRoute
} from '../../services/rapidKLService';

export default function App() {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [nearbyRoutes, setNearbyRoutes] = useState<BusRoute[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>('Loading...');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-announce when page loads
  useEffect(() => {
    const announceHomepage = () => {
      Speech.speak('You are in homepage now. Swipe left to start scanning for buses, or double tap anywhere for quick bus tracking.', {
        rate: 1.0,
        pitch: 1.0,
      });
    };

    // Delay announcement slightly to ensure app is ready
    setTimeout(announceHomepage, 500);
  }, []);

  // Load nearby routes when app starts
  useEffect(() => {
    loadNearbyRoutes();
  }, []);

  // Load nearby routes from RapidKL API
  const loadNearbyRoutes = async () => {
    try {
      setIsLoadingRoutes(true);
      const routeData = await getNearbyRoutes();
      setNearbyRoutes(routeData.routes);
      setCurrentLocation(routeData.nearestStop);
    } catch (error) {
      console.error('Error loading nearby routes:', error);
      // Fallback announcement
      Speech.speak('Unable to load nearby routes. Please check your location settings.');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Start voice listening for route commands
  const startVoiceListening = async () => {
    setIsListening(true);
    setVoiceCommand('');

    // Start real voice recognition with permission handling
    try {
      await voiceRecognition.startListening((result: VoiceRecognitionResult) => {
        console.log('Voice result:', result.text);

        // Extract route from voice input
        const routeId = extractRouteFromVoice(result.text);

        if (routeId) {
          // Find matching route
          const matchedRoute = nearbyRoutes.find(route =>
            route.routeId.toLowerCase() === routeId.toLowerCase()
          );

          if (matchedRoute) {
            // Stop current speech and process selection
            Speech.stop();
            setIsListening(false);
            selectRoute(matchedRoute);
            return;
          }
        }

        // If no route matched, provide feedback
        Speech.speak(`Did not recognize "${routeId || result.text}" as a nearby route. Try again or tap to select.`);
      });
    } catch (error) {
      console.error('Voice recognition error:', error);
      Speech.speak('Unable to start voice recognition. Please check microphone permissions.');
      setIsListening(false);
    }
  };

  // Stop voice listening
  const stopVoiceListening = () => {
    setIsListening(false);
    voiceRecognition.stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
  };

  // Handle double-tap for quick actions with voice commands
  const handleScreenTap = () => {
    const now = Date.now();

    if (now - lastTap < 300) { // Double tap within 300ms
      if (isLoadingRoutes) {
        Speech.speak('Loading nearby routes, please wait...');
        return;
      }

      setShowQuickActions(true);

      if (nearbyRoutes.length === 0) {
        Speech.speak('No nearby routes found. Please check your location or try again later.');
        return;
      }

      // Start voice listening
      startVoiceListening();

      // Announce nearby routes with voice command instructions
      const routesList = nearbyRoutes.map(route => route.routeId).join(', ');
      const announcement = `Quick Actions. From ${currentLocation}, nearby routes: ${routesList}. Say a route number or tap to select.`;

      Speech.speak(announcement, {
        rate: 1.0,
        pitch: 1.0,
      });

      // Store timeout reference for potential interruption
      speechTimeoutRef.current = setTimeout(() => {
        // After announcement, provide additional help
        if (isListening) {
          Speech.speak('Listening for route number...');
        }
      }, 8000);
    }

    setLastTap(now);
  };

  // Handle route selection with real bus data
  const selectRoute = async (route: BusRoute) => {
    setShowQuickActions(false);

    try {
      Speech.speak(`Getting live times for route ${route.routeId}...`);

      // Get real-time bus arrival data
      const arrivals = await getBusArrivalTimes(route.routeId);

      if (arrivals.length === 0) {
        Speech.speak(`No buses currently scheduled for route ${route.routeId}. Please try again later.`);
        return;
      }

      // Start tracking the route
      startRouteTracking(route.routeId);

      // Announce the next bus arrival
      const nextBus = arrivals[0];
      const reliabilityText = nextBus.reliability === 'On Time' ? '' : ` ${nextBus.reliability.toLowerCase()}`;

      Speech.speak(
        `Route ${route.routeId} to ${route.description.split('↔')[1] || route.direction}. ` +
        `Next bus arrives in ${nextBus.arrivalMinutes} minutes at platform ${nextBus.platform}${reliabilityText}. ` +
        `Bus number ${nextBus.busNumber}. Tracking started.`,
        {
          rate: 1.0,
          pitch: 1.1,
        }
      );

      // If there are more buses, announce them too
      if (arrivals.length > 1) {
        setTimeout(() => {
          const secondBus = arrivals[1];
          Speech.speak(`Following bus in ${secondBus.arrivalMinutes} minutes.`);
        }, 3000);
      }

    } catch (error) {
      console.error('Error getting bus arrival times:', error);
      Speech.speak(`Error getting bus times for route ${route.routeId}. Please try again.`);
    }
  };

  // Close quick actions
  const closeQuickActions = () => {
    setShowQuickActions(false);
    stopVoiceListening();
    Speech.stop();
    Speech.speak('Quick actions closed');

    // Clear any pending timeouts
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
  };

  // Handle swipe gestures with PanResponder (simplified)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },

    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;

      // Swipe left to go to camera (threshold: -50px)
      if (dx < -50) {
        Speech.speak('Going to camera');
        router.push('/camera');
      }
    },
  });

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <TouchableWithoutFeedback onPress={handleScreenTap}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>VoiceNav</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Navigation Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.navigationIcon}>✈️</Text>
            </View>

            {/* Destination Text */}
            <Text style={styles.destinationTitle}>Your Next</Text>
            <Text style={styles.destinationTitle}>Destination</Text>
            <Text style={styles.assistantSubtitle}>Your AI Assistant</Text>

            {/* Location Status */}
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>
                {isLoadingRoutes ? 'Finding location...' : currentLocation}
              </Text>
            </View>

            {/* Swipe Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.swipeInstruction}>← Swipe left to start scanning</Text>
              <Text style={styles.swipeSubtext}>Point your phone at buses and double-tap to capture</Text>
              <Text style={styles.quickActionHint}>Double-tap anywhere for quick bus tracking</Text>
            </View>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>

      {/* Quick Actions Modal */}
      <Modal
        visible={showQuickActions}
        transparent={true}
        animationType="fade"
        onRequestClose={closeQuickActions}
      >
        <TouchableWithoutFeedback onPress={closeQuickActions}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.quickActionsContainer}>
                <Text style={styles.quickActionsTitle}>🚌 Quick Bus Tracking</Text>
                <Text style={styles.quickActionsSubtitle}>
                  {isLoadingRoutes ? 'Loading routes...' : `From ${currentLocation}:`}
                </Text>

                {isListening && (
                  <View style={styles.voiceIndicator}>
                    <Text style={styles.voiceIndicatorText}>🎤 Listening... Say a route number (e.g. "581")</Text>
                    <Text style={styles.voiceHelpText}>Allow microphone permission when prompted</Text>
                    <Text style={styles.voiceHelpText}>Or test with: simulateVoice("581")</Text>
                  </View>
                )}

                {isLoadingRoutes ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>📍 Finding nearby routes...</Text>
                  </View>
                ) : nearbyRoutes.length === 0 ? (
                  <View style={styles.noRoutesContainer}>
                    <Text style={styles.noRoutesText}>No routes found nearby</Text>
                    <TouchableOpacity onPress={loadNearbyRoutes} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  nearbyRoutes.map((route) => (
                    <TouchableOpacity
                      key={route.routeId}
                      style={styles.routeButton}
                      onPress={() => selectRoute(route)}
                      accessibilityLabel={`Route ${route.routeId} ${route.description}`}
                    >
                      <Text style={styles.routeText}>
                        Route {route.routeId} {route.isExpress && '⚡'}
                      </Text>
                      <Text style={styles.routeDescription}>
                        {route.description}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}

                <TouchableOpacity style={styles.closeButton} onPress={closeQuickActions}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  navigationIcon: {
    fontSize: 80,
    color: '#4A90E2',
    transform: [{ rotate: '45deg' }],
  },
  destinationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 38,
  },
  assistantSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeInstruction: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'center',
    marginBottom: 10,
  },
  swipeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActionHint: {
    fontSize: 12,
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    minWidth: 300,
    maxWidth: 350,
  },
  quickActionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  quickActionsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  routeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  routeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noRoutesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noRoutesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  retryButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceIndicator: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  voiceIndicatorText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  voiceHelpText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
