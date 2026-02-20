// RapidKL Bus Service - Real-time bus tracking for Kuala Lumpur
import * as Location from 'expo-location';

export interface BusRoute {
    routeId: string;
    routeName: string;
    description: string;
    direction: string;
    isExpress: boolean;
}

export interface BusStop {
    stopId: string;
    stopName: string;
    latitude: number;
    longitude: number;
    routes: string[];
}

export interface BusArrival {
    routeId: string;
    routeName: string;
    arrivalMinutes: number;
    platform: number;
    direction: string;
    busNumber: string;
    reliability: 'On Time' | 'Delayed' | 'Early';
}

export interface NearbyRoutesResult {
    routes: BusRoute[];
    currentLocation: string;
    nearestStop: string;
}

// Real KL bus routes data structure
const KL_BUS_ROUTES: BusRoute[] = [
    { routeId: '581', routeName: '581', description: 'KL Sentral ↔ Gombak', direction: 'Both', isExpress: false },
    { routeId: 'T581', routeName: 'T581', description: 'Express KL Sentral ↔ Gombak', direction: 'Both', isExpress: true },
    { routeId: 'U84', routeName: 'U84', description: 'University Malaya ↔ KL Sentral', direction: 'Both', isExpress: false },
    { routeId: 'B101', routeName: 'B101', description: 'City Center Loop', direction: 'Circular', isExpress: false },
    { routeId: '400', routeName: '400', description: 'Klang ↔ KL Sentral', direction: 'Both', isExpress: false },
    { routeId: 'U83', routeName: 'U83', description: 'University Putra ↔ LRT Serdang', direction: 'Both', isExpress: false },
    { routeId: '500', routeName: '500', description: 'Shah Alam ↔ KL Sentral', direction: 'Both', isExpress: false },
    { routeId: 'T500', routeName: 'T500', description: 'Express Shah Alam ↔ KL Sentral', direction: 'Both', isExpress: true },
];

// Major KL bus stops (simplified)
const KL_BUS_STOPS: BusStop[] = [
    {
        stopId: 'KLS001',
        stopName: 'KL Sentral',
        latitude: 3.1347,
        longitude: 101.6841,
        routes: ['581', 'T581', 'U84', 'B101', '400', '500', 'T500']
    },
    {
        stopId: 'BB001',
        stopName: 'Bukit Bintang',
        latitude: 3.1478,
        longitude: 101.7108,
        routes: ['B101', '400', '500']
    },
    {
        stopId: 'KLCC001',
        stopName: 'KLCC',
        latitude: 3.1570,
        longitude: 101.7116,
        routes: ['B101', '400', 'T400']
    },
    {
        stopId: 'GM001',
        stopName: 'Gombak Terminal',
        latitude: 3.2588,
        longitude: 101.6539,
        routes: ['581', 'T581']
    },
];

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
}

/**
 * Get user's current location
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.warn('Location permission not granted');
            return null;
        }

        const location = await Location.getCurrentPositionAsync({});
        return location;
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

/**
 * Find nearby bus stops based on current location
 */
export async function getNearbyBusStops(maxDistance: number = 1000): Promise<BusStop[]> {
    const location = await getCurrentLocation();

    if (!location) {
        // Fallback: Return major stops if location unavailable
        return KL_BUS_STOPS.slice(0, 3);
    }

    const { latitude, longitude } = location.coords;

    return KL_BUS_STOPS
        .map(stop => ({
            ...stop,
            distance: calculateDistance(latitude, longitude, stop.latitude, stop.longitude)
        }))
        .filter(stop => stop.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Return top 5 nearest stops
}

/**
 * Get nearby routes based on current location
 */
export async function getNearbyRoutes(): Promise<NearbyRoutesResult> {
    try {
        const nearbyStops = await getNearbyBusStops();

        if (nearbyStops.length === 0) {
            // Fallback to major routes if no stops found
            return {
                routes: KL_BUS_ROUTES.slice(0, 5),
                currentLocation: 'Unknown location',
                nearestStop: 'KL Sentral (default)'
            };
        }

        const nearestStop = nearbyStops[0];

        // Get unique routes from nearby stops
        const routeIds = Array.from(new Set(
            nearbyStops.flatMap(stop => stop.routes)
        ));

        const routes = KL_BUS_ROUTES.filter(route =>
            routeIds.includes(route.routeId)
        );

        return {
            routes: routes.slice(0, 6), // Limit to 6 routes for UI
            currentLocation: nearestStop.stopName,
            nearestStop: nearestStop.stopName
        };

    } catch (error) {
        console.error('Error getting nearby routes:', error);
        // Fallback data
        return {
            routes: KL_BUS_ROUTES.slice(0, 5),
            currentLocation: 'Location unavailable',
            nearestStop: 'KL Sentral (fallback)'
        };
    }
}

/**
 * Get real-time bus arrival information for a specific route
 */
export async function getBusArrivalTimes(routeId: string, stopId?: string): Promise<BusArrival[]> {
    try {
        // In a real implementation, this would call RapidKL API
        // For now, simulating realistic arrival data

        const route = KL_BUS_ROUTES.find(r => r.routeId === routeId);
        if (!route) {
            throw new Error(`Route ${routeId} not found`);
        }

        // Simulate 1-3 upcoming buses
        const numberOfBuses = Math.floor(Math.random() * 3) + 1;
        const arrivals: BusArrival[] = [];

        let baseTime = Math.floor(Math.random() * 8) + 2; // First bus in 2-10 minutes

        for (let i = 0; i < numberOfBuses; i++) {
            const arrivalTime = baseTime + (i * (Math.floor(Math.random() * 15) + 10)); // 10-25 min intervals
            const platform = Math.floor(Math.random() * 4) + 1;
            const busNumber = `${routeId}-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

            // Realistic reliability simulation
            let reliability: 'On Time' | 'Delayed' | 'Early' = 'On Time';
            const reliabilityRandom = Math.random();
            if (reliabilityRandom < 0.1) reliability = 'Early';
            else if (reliabilityRandom < 0.25) reliability = 'Delayed';

            arrivals.push({
                routeId: route.routeId,
                routeName: route.routeName,
                arrivalMinutes: arrivalTime,
                platform,
                direction: route.direction === 'Both' ? (Math.random() < 0.5 ? 'Inbound' : 'Outbound') : route.direction,
                busNumber,
                reliability
            });
        }

        return arrivals.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);

    } catch (error) {
        console.error('Error getting bus arrival times:', error);
        throw error;
    }
}

/**
 * Start tracking a specific route (sets up notifications/updates)
 */
export function startRouteTracking(routeId: string): void {
    console.log(`Started tracking route ${routeId}`);
    // In real implementation, this would set up periodic API calls
    // and push notifications for bus updates
}

/**
 * Validate if a route exists in the system
 */
export function validateRoute(routeId: string): BusRoute | null {
    return KL_BUS_ROUTES.find(route =>
        route.routeId.toLowerCase() === routeId.toLowerCase()
    ) || null;
}

/**
 * Get route suggestions based on partial input
 */
export function getRouteSuggestions(input: string): BusRoute[] {
    const searchTerm = input.toLowerCase();
    return KL_BUS_ROUTES.filter(route =>
        route.routeId.toLowerCase().includes(searchTerm) ||
        route.description.toLowerCase().includes(searchTerm)
    ).slice(0, 5);
}