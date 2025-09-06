import { NextRequest, NextResponse } from 'next/server';
import { LocationData, LocationUpdateRequest, LocationHistory, LocationStats, LocationQueryParams, LocationSource } from '@/types/location';

// Demo location data storage
let locationData: LocationData[] = [
  {
    id: '1',
    userId: '1',
    latitude: 40.7589,
    longitude: -73.9851,
    accuracy: 10,
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    address: 'Main Office, New York, NY',
    isManual: false,
    source: LocationSource.GPS
  },
  {
    id: '2',
    userId: '2',
    latitude: 40.7614,
    longitude: -73.9776,
    accuracy: 15,
    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    address: 'Client Site A, New York, NY',
    isManual: false,
    source: LocationSource.GPS
  }
];

export async function POST(request: NextRequest) {
  try {
    const body: LocationUpdateRequest = await request.json();
    
    // Validate request
    if (!body.latitude || !body.longitude || !body.timestamp) {
      return NextResponse.json(
        { error: 'Latitude, longitude, and timestamp are required' },
        { status: 400 }
      );
    }

    // Get user from session (in production, this would come from authenticated session)
    const userId = '1'; // Demo user ID

    // Create location record
    const locationRecord: LocationData = {
      id: generateId(),
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy || 10,
      timestamp: body.timestamp,
      address: await reverseGeocode(body.latitude, body.longitude),
      isManual: false,
      source: body.source || LocationSource.GPS,
      speed: body.speed,
      heading: body.heading,
      altitude: body.altitude
    };

    // Store location data
    locationData.push(locationRecord);

    // Keep only last 1000 locations per user to prevent memory issues in demo
    const userLocations = locationData.filter(l => l.userId === userId);
    if (userLocations.length > 1000) {
      locationData = locationData.filter(l => l.userId !== userId).concat(userLocations.slice(-1000));
    }

    // Check for geofence events (this would typically be done in a background service)
    const geofenceEvents = await checkGeofenceEvents(locationRecord);

    return NextResponse.json({
      success: true,
      locationId: locationRecord.id,
      geofenceEvents,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: LocationQueryParams = {
      userId: searchParams.get('userId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      includeAddress: searchParams.get('includeAddress') === 'true'
    };

    let filteredLocations = [...locationData];

    // Filter by user
    if (query.userId) {
      filteredLocations = filteredLocations.filter(l => l.userId === query.userId);
    }

    // Filter by date range
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      filteredLocations = filteredLocations.filter(l => new Date(l.timestamp) >= startDate);
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      filteredLocations = filteredLocations.filter(l => new Date(l.timestamp) <= endDate);
    }

    // Sort by timestamp (most recent first)
    filteredLocations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (query.limit) {
      filteredLocations = filteredLocations.slice(0, query.limit);
    }

    // Remove address if not requested to save bandwidth
    if (!query.includeAddress) {
      filteredLocations = filteredLocations.map(({ address, ...location }) => location);
    }

    return NextResponse.json({
      locations: filteredLocations,
      total: filteredLocations.length,
      query
    });

  } catch (error) {
    console.error('Location fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// Get location history for a user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, dateRange } = body;

    if (!userId || !dateRange?.start || !dateRange?.end) {
      return NextResponse.json(
        { error: 'User ID and date range are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const userLocations = locationData
      .filter(l => l.userId === userId)
      .filter(l => {
        const timestamp = new Date(l.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate total distance traveled
    let totalDistance = 0;
    for (let i = 1; i < userLocations.length; i++) {
      totalDistance += calculateDistance(
        userLocations[i - 1],
        userLocations[i]
      );
    }

    // Calculate time active (time between first and last location)
    const timeActive = userLocations.length > 1 ? 
      new Date(userLocations[userLocations.length - 1].timestamp).getTime() - 
      new Date(userLocations[0].timestamp).getTime() : 0;

    const history: LocationHistory = {
      userId,
      locations: userLocations,
      dateRange,
      totalDistance: Math.round(totalDistance * 100) / 100,
      timeActive: Math.floor(timeActive / 1000 / 60) // in minutes
    };

    return NextResponse.json(history);

  } catch (error) {
    console.error('Location history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location history' },
      { status: 500 }
    );
  }
}

// Get location statistics
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, dateRange } = body;

    if (!userId || !dateRange?.start || !dateRange?.end) {
      return NextResponse.json(
        { error: 'User ID and date range are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const userLocations = locationData
      .filter(l => l.userId === userId)
      .filter(l => {
        const timestamp = new Date(l.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (userLocations.length === 0) {
      const emptyStats: LocationStats = {
        userId,
        dateRange,
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        locationsRecorded: 0,
        geofenceEvents: 0,
        attendanceEvents: 0
      };
      return NextResponse.json(emptyStats);
    }

    // Calculate statistics
    let totalDistance = 0;
    let totalTime = 0;
    const speeds: number[] = [];

    for (let i = 1; i < userLocations.length; i++) {
      const distance = calculateDistance(userLocations[i - 1], userLocations[i]);
      const timeDiff = (new Date(userLocations[i].timestamp).getTime() - 
                       new Date(userLocations[i - 1].timestamp).getTime()) / 1000 / 3600; // hours
      
      totalDistance += distance;
      totalTime += timeDiff;
      
      if (timeDiff > 0) {
        speeds.push(distance / timeDiff);
      }
    }

    const averageSpeed = speeds.length > 0 ? 
      speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0;

    const stats: LocationStats = {
      userId,
      dateRange,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      averageSpeed: Math.round(averageSpeed * 100) / 100,
      locationsRecorded: userLocations.length,
      geofenceEvents: 0, // Would be calculated from geofence events
      attendanceEvents: 0 // Would be calculated from attendance events
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Location statistics error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate location statistics' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // In production, this would use a real geocoding service
  // For demo purposes, return formatted coordinates
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function calculateDistance(location1: LocationData, location2: LocationData): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(location2.latitude - location1.latitude);
  const dLon = toRadians(location2.longitude - location1.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(location1.latitude)) * Math.cos(toRadians(location2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

async function checkGeofenceEvents(location: LocationData) {
  // In production, this would check against actual geofences
  // For demo purposes, return empty array
  return [];
}