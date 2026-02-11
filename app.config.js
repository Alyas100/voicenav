import 'dotenv/config';

export default {
    expo: {
        name: "voicenav",
        slug: "voicenav",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        scheme: "voicenav",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        splash: {
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        assetBundlePatterns: [
            "**/*"
        ],
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#ffffff"
            }
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png"
        },
        plugins: [
            "expo-router",
            [
                "expo-camera",
                {
                    "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
                    "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
                    "recordAudioAndroid": true
                }
            ]
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        }
    }
};