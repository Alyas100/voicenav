// Gemini Vision API service for bus detection and obstacle analysis
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export interface AnalysisResult {
    buses: string[];
    obstacles: string[];
    description: string;
}

export const analyzeImage = async (imageBase64: string): Promise<AnalysisResult> => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: "Analyze this image for public transportation accessibility. Identify: 1) Any buses with their route numbers and destinations, 2) Obstacles in the path (poles, people, steps, barriers), 3) Landmarks (bus stops, benches, shelters). Respond in JSON format with buses[], obstacles[], and description fields."
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageBase64
                                }
                            }
                        ]
                    }]
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || 'API request failed');
        }

        // Parse the AI response and structure it
        const aiText = result.candidates[0]?.content?.parts[0]?.text || '';
        console.log('Raw AI response:', aiText);

        // Clean the response and extract JSON
        let analysis: AnalysisResult;
        try {
            // Remove markdown formatting if present
            let cleanedText = aiText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            console.log('Cleaned JSON text:', cleanedText);
            analysis = JSON.parse(cleanedText);
            console.log('Parsed analysis:', analysis);

            // Validate and clean the parsed data
            analysis.buses = Array.isArray(analysis.buses) ? analysis.buses.filter(bus => bus && bus.length > 0) : [];
            analysis.obstacles = Array.isArray(analysis.obstacles) ? analysis.obstacles.filter(obs => obs && obs.length > 0) : [];

        } catch (parseError) {
            // Fallback parsing if JSON parsing fails
            console.log('JSON parsing failed:', parseError);
            console.log('Using fallback text parsing');
            analysis = {
                buses: extractBusInfo(aiText),
                obstacles: extractObstacles(aiText),
                description: aiText
            };
        }

        return analysis;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
};


// Helper functions for text parsing fallback
const extractBusInfo = (text: string): string[] => {
    // Look for bus numbers - more specific patterns
    const busPatterns = [
        /bus\s*#?(\d{1,4})/gi, // "bus 401", "bus #401"
        /route\s*#?(\d{1,4})/gi, // "route 401", "route #401"
        /line\s*(\d{1,4})/gi, // "line 401"
        /\b(\d{1,4})\s*bus/gi // "401 bus"
    ];

    const buses: string[] = [];
    busPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const number = match.replace(/[^\d]/g, '');
                if (number && number.length >= 1 && number.length <= 4) {
                    buses.push(number);
                }
            });
        }
    });

    return [...new Set(buses)]; // Remove duplicates
};

const extractObstacles = (text: string): string[] => {
    // More specific obstacle detection - only if context suggests it's an obstacle
    const obstaclePatterns = [
        /\b(pole|post|pillar)\b/gi,
        /\b(person|people|pedestrian)\b/gi,
        /\b(step|stairs|curb)\b/gi,
        /\b(barrier|fence|wall)\b/gi,
        /\b(parked\s*car|vehicle)\b/gi,
        /\b(construction|roadwork)\b/gi
    ];

    const obstacles: string[] = [];

    // Only detect obstacles if the text mentions transportation/outdoor context
    const transportContext = /bus|stop|street|road|sidewalk|crosswalk|traffic|public transport/i.test(text);

    if (transportContext) {
        obstaclePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    obstacles.push(match.toLowerCase().trim());
                });
            }
        });
    }

    return [...new Set(obstacles)]; // Remove duplicates
};

// Convert image URI to base64
export const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Image conversion error:', error);
        throw error;
    }
};