// Voice Recognition Service for VoiceNav
// Uses Web Speech API for real-time voice recognition

export interface VoiceRecognitionResult {
    text: string;
    confidence: number;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export class VoiceRecognitionService {
    private static instance: VoiceRecognitionService;
    private recognition: any = null;
    private isListening: boolean = false;
    private callbacks: ((result: VoiceRecognitionResult) => void)[] = [];
    private hasPermission: boolean = false;

    static getInstance(): VoiceRecognitionService {
        if (!VoiceRecognitionService.instance) {
            VoiceRecognitionService.instance = new VoiceRecognitionService();
        }
        return VoiceRecognitionService.instance;
    }

    constructor() {
        this.initializeRecognition();
        this.requestMicrophonePermission();
    }

    private initializeRecognition(): void {
        // Check if speech recognition is available
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';

                this.recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    const confidence = event.results[0][0].confidence;

                    console.log('🎤 Speech recognized:', transcript);

                    const result: VoiceRecognitionResult = {
                        text: transcript,
                        confidence
                    };

                    this.callbacks.forEach(callback => callback(result));
                    this.stopListening();
                };

                this.recognition.onerror = (event: any) => {
                    console.error('🎤 Speech recognition error:', event.error);
                    this.stopListening();
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                    console.log('🎤 Speech recognition ended');
                };
            }
        }
    }

    // Request microphone permission
    private async requestMicrophonePermission(): Promise<void> {
        try {
            if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
                console.log('🎤 Requesting microphone permission...');

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Stop the stream immediately - we just wanted permission
                stream.getTracks().forEach(track => track.stop());

                this.hasPermission = true;
                console.log('✅ Microphone permission granted!');
            } else {
                console.log('📱 MediaDevices API not available - using fallback');
                this.hasPermission = false;
            }
        } catch (error) {
            console.error('❌ Microphone permission denied:', error);
            this.hasPermission = false;
        }
    }

    // Check if we have microphone permission
    async checkPermission(): Promise<boolean> {
        if (!this.hasPermission) {
            await this.requestMicrophonePermission();
        }
        return this.hasPermission;
    }

    // Start listening for voice commands
    async startListening(callback: (result: VoiceRecognitionResult) => void): Promise<void> {
        // Check permission first
        const hasPermission = await this.checkPermission();

        if (!hasPermission) {
            console.log('🎤 No microphone permission - using manual input');
            this.promptForManualInput(callback);
            return;
        }

        if (this.isListening || !this.recognition) {
            console.log('🎤 Recognition not available - using manual input');
            this.promptForManualInput(callback);
            return;
        }

        this.isListening = true;
        this.callbacks = [callback];

        try {
            console.log('🎤 Starting speech recognition with permission...');
            this.recognition.start();
        } catch (error) {
            console.error('🎤 Failed to start speech recognition:', error);
            this.promptForManualInput(callback);
        }
    }

    // Fallback: Prompt for manual text input
    private promptForManualInput(callback: (result: VoiceRecognitionResult) => void): void {
        setTimeout(() => {
            if (!this.hasPermission) {
                console.log('🎤 Microphone access needed! Please allow microphone permission and try again.');
                console.log('💡 For testing, use: simulateVoice("581")');
            } else {
                console.log('🎤 Speech recognition not available. Use: simulateVoice("581")');
            }

            // Store callback for manual simulation
            (global as any).manualVoiceCallback = callback;

            // Auto-timeout after 15 seconds
            setTimeout(() => {
                this.stopListening();
            }, 15000);
        }, 1000);
    }

    // Stop listening
    stopListening(): void {
        this.isListening = false;
        this.callbacks = [];

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.log('🎤 Recognition already stopped');
            }
        }

        console.log('🎤 Voice recognition stopped');
    }

    // Simulate voice input (for testing)
    simulateVoiceInput(text: string): void {
        const result: VoiceRecognitionResult = {
            text,
            confidence: 0.9
        };

        console.log(`🎤 Simulated voice input: "${text}"`);

        // Use stored callback if available
        const callback = (global as any).manualVoiceCallback;
        if (callback) {
            callback(result);
            (global as any).manualVoiceCallback = null;
        } else {
            this.callbacks.forEach(cb => cb(result));
        }

        this.stopListening();
    }

    isCurrentlyListening(): boolean {
        return this.isListening;
    }
}

// Voice command patterns for bus routes
export const extractRouteFromVoice = (text: string): string | null => {
    const cleanText = text.toLowerCase().trim();

    // Common voice patterns for route numbers
    const patterns = [
        // Direct numbers: "581", "five eight one"
        /\b(\d+[a-z]*)\b/gi,

        // T-prefixed routes: "t581", "t five eight one"
        /\bt\s*(\d+)\b/gi,

        // U-prefixed routes: "u84", "u eight four"
        /\bu\s*(\d+)\b/gi,

        // B-prefixed routes: "b101", "b one zero one"
        /\bb\s*(\d+)\b/gi,

        // Spoken numbers: "five eight one"
        /\b(five eight one|five eight)\b/gi,
        /\b(eight four|eighty four)\b/gi,
    ];

    // Convert spoken numbers to digits
    const spokenToDigit: Record<string, string> = {
        'five eight one': '581',
        'five eight': '58',
        'eight four': '84',
        'eighty four': '84',
        'one zero one': '101',
        'four zero zero': '400',
        'five zero zero': '500',
    };

    // Check spoken patterns first
    for (const [spoken, digit] of Object.entries(spokenToDigit)) {
        if (cleanText.includes(spoken)) {
            return digit;
        }
    }

    // Check numeric patterns
    for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
            return matches[0].replace(/\s+/g, '').toUpperCase();
        }
    }

    return null;
};

// Global instance for easy access
export const voiceRecognition = VoiceRecognitionService.getInstance();

// Development helper: Expose simulation function globally
if (__DEV__) {
    (global as any).simulateVoice = (text: string) => {
        voiceRecognition.simulateVoiceInput(text);
    };
}