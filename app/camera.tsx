import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { analyzeImage } from '../services/geminiService';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState('');

    const captureAndAnalyze = async () => {
        if (!cameraRef.current || isAnalyzing) return;

        try {
            setIsAnalyzing(true);
            Speech.speak('Taking photo and analyzing...', { rate: 1.2 });

            // Capture photo
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
            });

            if (!photo.base64) {
                throw new Error('Failed to capture photo with base64 data');
            }

            // Analyze with Gemini AI
            const analysis = await analyzeImage(photo.base64);

            // Create voice announcement
            let announcement = '';

            if (analysis.buses.length > 0) {
                announcement += `Buses detected: ${analysis.buses.join(', ')}. `;
            }

            if (analysis.obstacles.length > 0) {
                announcement += `Obstacles found: ${analysis.obstacles.join(', ')}. `;
            }

            if (announcement === '') {
                announcement = 'No buses or obstacles detected in this image.';
            }

            console.log('DBG-2:', analysis);
            console.log('DBG-2:', announcement);

            setLastAnalysis(announcement);

            // Speak the results
            Speech.speak(announcement, {
                rate: 1.0,
                pitch: 1.1,
            });

        } catch (error) {
            console.error('Capture and analysis error:', error);
            // Debug: Check if API key is loaded
            console.log('API Key status:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'Found' : 'Missing');
            const errorMsg = 'Error analyzing image. Please try again.';
            setLastAnalysis(errorMsg);
            Speech.speak(errorMsg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!permission) {
        return <View style={{ flex: 1, backgroundColor: 'black' }} />;
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>We need camera permission</Text>
                <TouchableOpacity onPress={requestPermission}>
                    <Text style={{ marginTop: 20, color: 'blue' }}>
                        Grant Permission
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#0b132b' }}>
            <CameraView
                style={{ flex: 1 }}
                ref={cameraRef}
                facing="back"
            />

            {/* Top Bar */}
            <SafeAreaView style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.icon}>✖️</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Text style={styles.icon}>🔊</Text>
                </TouchableOpacity>
            </SafeAreaView>

            {/* Detection Box */}
            <View style={styles.overlay}>
                <View style={styles.detectionBox}>
                    <Text style={{ color: '#4da3ff', fontWeight: 'bold' }}>
                        DETECTION ZONE
                    </Text>
                    <Text style={{ color: '#ccc', marginTop: 6 }}>
                        [LIVE FEED]
                    </Text>
                    <Text style={{ color: '#888', marginTop: 4 }}>
                        Point at bus front
                    </Text>
                </View>
            </View>

            {/* Bottom UI */}
            <View style={styles.bottom}>
                <Text style={styles.scanText}>
                    {isAnalyzing ? '🔍 ANALYZING...' : '🔎 SCANNING...'}
                </Text>

                <TouchableOpacity
                    style={[styles.captureBtn, isAnalyzing && styles.captureDisabled]}
                    onPress={captureAndAnalyze}
                    disabled={isAnalyzing}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>
                        {isAnalyzing ? 'ANALYZING...' : 'CAPTURE NOW'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    {lastAnalysis || 'HOLD PHONE STEADY • ALIGN BUS IN FRAME'}
                </Text>
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 10,
    },

    icon: { fontSize: 22, color: 'white' },

    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },

    detectionBox: {
        width: width * 0.7,
        height: width * 0.4,
        borderWidth: 2,
        borderColor: '#4da3ff',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },

    bottom: {
        padding: 20,
        backgroundColor: '#0b132b',
    },

    scanText: {
        color: '#4da3ff',
        marginBottom: 20,
    },

    captureBtn: {
        backgroundColor: '#101935',
        paddingVertical: 18,
        alignItems: 'center',
        borderRadius: 12,
    },

    captureDisabled: {
        backgroundColor: '#333',
        opacity: 0.6,
    },

    hint: {
        color: '#777',
        textAlign: 'center',
        marginTop: 15,
        fontSize: 12,
    },
});
