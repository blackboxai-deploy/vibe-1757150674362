"use client";

import { LocationData, LocationUpdateRequest, LocationPermissions, LocationStatus, DistanceCalculation, LocationSource, PermissionLevel } from '@/types/location';

export class LocationService {
  private watchId: number | null = null;
  private isTracking = false;
  private lastKnownLocation: LocationData | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Request location permissions from the user
   */
  async requestLocationPermission(): Promise<LocationPermissions> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      const hasConsented = permission.state === 'granted';
      
      return {
        userId: 'current-user', // This would come from auth context
        hasConsented,
        consentDate: hasConsented ? new Date().toISOString() : undefined,
        permissionLevel: hasConsented ? PermissionLevel.FULL : PermissionLevel.NONE,
        trackingEnabled: hasConsented,
        sharingEnabled: false,
        historyEnabled: hasConsented,
        canRevoke: true
      } as LocationPermissions;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      throw new Error('Unable to check location permissions');
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            id: this.generateId(),
            userId: 'current-user', // This would come from auth context
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            isManual: false,
            source: LocationSource.GPS,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            altitude: position.coords.altitude || undefined
          };
          
          this.lastKnownLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Start continuous location tracking
   */
  async startTracking(callback: (location: LocationData) => void): Promise<void> {
    if (this.isTracking) {
      throw new Error('Location tracking is already active');
    }

    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    this.isTracking = true;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          id: this.generateId(),
          userId: 'current-user',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          isManual: false,
          source: LocationSource.GPS,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          altitude: position.coords.altitude || undefined
        };

        this.lastKnownLocation = locationData;
        callback(locationData);
      },
      (error) => {
        console.error('Location tracking error:', error);
        // Continue tracking despite errors
      },
      options
    );

    // Set up periodic updates every 30 seconds
    this.updateInterval = setInterval(async () => {
      if (this.lastKnownLocation) {
        await this.sendLocationUpdate(this.lastKnownLocation);
      }
    }, 30000);
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isTracking = false;
  }

  /**
   * Send location update to server
   */
  async sendLocationUpdate(location: LocationData): Promise<void> {
    try {
      const updateRequest: LocationUpdateRequest = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        source: location.source,
        speed: location.speed,
        heading: location.heading,
        altitude: location.altitude
      };

      const response = await fetch('/api/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Error sending location update:', error);
      // Store in local storage for retry later
      this.storeOfflineLocation(location);
    }
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(location1: LocationData, location2: LocationData, unit: 'meters' | 'kilometers' | 'miles' = 'meters'): DistanceCalculation {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in miles or km
    const dLat = this.toRadians(location2.latitude - location1.latitude);
    const dLon = this.toRadians(location2.longitude - location1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(location1.latitude)) * Math.cos(this.toRadians(location2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;

    if (unit === 'meters') {
      distance = distance * 1000;
    }

    return {
      fromLocation: location1,
      toLocation: location2,
      distance: Math.round(distance * 100) / 100,
      unit
    };
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    // In a real application, you would use a geocoding service like Google Maps API
    // For demo purposes, we'll return a formatted coordinate string
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  /**
   * Check if location tracking is supported and enabled
   */
  isLocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current tracking status
   */
  getTrackingStatus(): LocationStatus {
    if (!this.isLocationSupported()) {
      return LocationStatus.UNKNOWN;
    }
    
    if (this.isTracking) {
      return LocationStatus.ACTIVE;
    }
    
    if (this.lastKnownLocation) {
      const timeDiff = Date.now() - new Date(this.lastKnownLocation.timestamp).getTime();
      return timeDiff < 300000 ? LocationStatus.IDLE : LocationStatus.OFFLINE; // 5 minutes threshold
    }
    
    return LocationStatus.OFFLINE;
  }

  /**
   * Store location data offline for later sync
   */
  private storeOfflineLocation(location: LocationData): void {
    try {
      const offlineLocations = JSON.parse(localStorage.getItem('offlineLocations') || '[]');
      offlineLocations.push(location);
      localStorage.setItem('offlineLocations', JSON.stringify(offlineLocations));
    } catch (error) {
      console.error('Error storing offline location:', error);
    }
  }

  /**
   * Sync offline locations with server
   */
  async syncOfflineLocations(): Promise<void> {
    try {
      const offlineLocations = JSON.parse(localStorage.getItem('offlineLocations') || '[]');
      
      if (offlineLocations.length === 0) {
        return;
      }

      for (const location of offlineLocations) {
        await this.sendLocationUpdate(location);
      }

      // Clear offline storage after successful sync
      localStorage.removeItem('offlineLocations');
    } catch (error) {
      console.error('Error syncing offline locations:', error);
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const locationService = new LocationService();