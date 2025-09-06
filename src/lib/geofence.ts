import { Geofence, GeofenceEvent, GeofenceEventType, GeofenceStatus } from '@/types/geofence';
import { LocationData } from '@/types/location';

export class GeofenceService {
  private activeGeofences: Geofence[] = [];
  private userStatus: Map<string, GeofenceStatus> = new Map();

  /**
   * Load geofences for a company
   */
  async loadGeofences(companyId: string): Promise<Geofence[]> {
    try {
      const response = await fetch(`/api/geofences?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to load geofences');
      }
      
      const geofences = await response.json();
      this.activeGeofences = geofences.filter((g: Geofence) => g.isActive);
      return this.activeGeofences;
    } catch (error) {
      console.error('Error loading geofences:', error);
      return [];
    }
  }

  /**
   * Check if a location is inside a geofence
   */
  checkGeofenceEntry(location: LocationData, userId: string): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];
    const currentStatus = this.userStatus.get(userId) || {
      userId,
      currentGeofences: [],
      lastGeofenceExit: undefined
    };

    for (const geofence of this.activeGeofences) {
      const isInside = this.isLocationInsideGeofence(location, geofence);
      const wasInside = currentStatus.currentGeofences.some(g => g.geofenceId === geofence.id);

      if (isInside && !wasInside) {
        // Entry event
        const event: GeofenceEvent = {
          id: this.generateEventId(),
          userId,
          geofenceId: geofence.id,
          eventType: GeofenceEventType.ENTER,
          timestamp: location.timestamp,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          isWorkingHours: this.isWithinWorkingHours(geofence),
          metadata: {
            geofenceName: geofence.name,
            geofenceType: geofence.type
          }
        };

        events.push(event);
        
        // Update user status
        currentStatus.currentGeofences.push({
          geofenceId: geofence.id,
          entryTime: location.timestamp,
          isAuthorized: this.isAuthorizedAccess(geofence)
        });

      } else if (!isInside && wasInside) {
        // Exit event
        const entryInfo = currentStatus.currentGeofences.find(g => g.geofenceId === geofence.id);
        const duration = entryInfo ? 
          Math.floor((new Date(location.timestamp).getTime() - new Date(entryInfo.entryTime).getTime()) / 1000 / 60) : 0;

        const event: GeofenceEvent = {
          id: this.generateEventId(),
          userId,
          geofenceId: geofence.id,
          eventType: GeofenceEventType.EXIT,
          timestamp: location.timestamp,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          duration,
          isWorkingHours: this.isWithinWorkingHours(geofence),
          metadata: {
            geofenceName: geofence.name,
            geofenceType: geofence.type,
            dwellTime: duration
          }
        };

        events.push(event);

        // Update user status
        currentStatus.currentGeofences = currentStatus.currentGeofences.filter(g => g.geofenceId !== geofence.id);
        currentStatus.lastGeofenceExit = {
          geofenceId: geofence.id,
          exitTime: location.timestamp,
          duration
        };
      }
    }

    this.userStatus.set(userId, currentStatus);
    return events;
  }

  /**
   * Check if a location is inside a geofence
   */
  private isLocationInsideGeofence(location: LocationData, geofence: Geofence): boolean {
    if (geofence.shape.type === 'circle') {
      return this.isPointInCircle(
        location.latitude,
        location.longitude,
        geofence.coordinates.center!.latitude,
        geofence.coordinates.center!.longitude,
        geofence.radius!
      );
    } else if (geofence.shape.type === 'polygon') {
      return this.isPointInPolygon(
        location.latitude,
        location.longitude,
        geofence.coordinates.points!
      );
    }
    
    return false;
  }

  /**
   * Check if point is inside circle
   */
  private isPointInCircle(
    pointLat: number,
    pointLon: number,
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(pointLat, pointLon, centerLat, centerLon);
    return distance <= radiusMeters;
  }

  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  private isPointInPolygon(
    pointLat: number,
    pointLon: number,
    polygonPoints: Array<{ latitude: number; longitude: number }>
  ): boolean {
    let inside = false;
    const x = pointLon;
    const y = pointLat;

    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].longitude;
      const yi = polygonPoints[i].latitude;
      const xj = polygonPoints[j].longitude;
      const yj = polygonPoints[j].latitude;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if current time is within geofence working hours
   */
  private isWithinWorkingHours(geofence: Geofence): boolean {
    if (!geofence.workingHours?.enabled) {
      return true; // No working hours restriction
    }

    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue, wed, etc.
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

    const daySchedule = geofence.workingHours.schedule[dayOfWeek];
    if (!daySchedule?.active) {
      return false;
    }

    return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
  }

  /**
   * Check if access to geofence is authorized at current time
   */
  private isAuthorizedAccess(geofence: Geofence): boolean {
    // Check working hours
    if (!this.isWithinWorkingHours(geofence)) {
      return false;
    }

    // Additional authorization logic could go here
    // For example, checking user permissions, restricted areas, etc.
    
    return true;
  }

  /**
   * Get current status for a user
   */
  getUserGeofenceStatus(userId: string): GeofenceStatus | undefined {
    return this.userStatus.get(userId);
  }

  /**
   * Create a new geofence
   */
  async createGeofence(geofence: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Geofence> {
    try {
      const response = await fetch('/api/geofences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geofence)
      });

      if (!response.ok) {
        throw new Error('Failed to create geofence');
      }

      const newGeofence = await response.json();
      if (newGeofence.isActive) {
        this.activeGeofences.push(newGeofence);
      }

      return newGeofence;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  }

  /**
   * Update an existing geofence
   */
  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence> {
    try {
      const response = await fetch(`/api/geofences/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update geofence');
      }

      const updatedGeofence = await response.json();
      
      // Update local cache
      const index = this.activeGeofences.findIndex(g => g.id === id);
      if (index !== -1) {
        if (updatedGeofence.isActive) {
          this.activeGeofences[index] = updatedGeofence;
        } else {
          this.activeGeofences.splice(index, 1);
        }
      } else if (updatedGeofence.isActive) {
        this.activeGeofences.push(updatedGeofence);
      }

      return updatedGeofence;
    } catch (error) {
      console.error('Error updating geofence:', error);
      throw error;
    }
  }

  /**
   * Delete a geofence
   */
  async deleteGeofence(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/geofences/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete geofence');
      }

      // Remove from local cache
      this.activeGeofences = this.activeGeofences.filter(g => g.id !== id);
      
      // Clear any user status related to this geofence
      this.userStatus.forEach((status, userId) => {
        status.currentGeofences = status.currentGeofences.filter(g => g.geofenceId !== id);
        this.userStatus.set(userId, status);
      });

    } catch (error) {
      console.error('Error deleting geofence:', error);
      throw error;
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const geofenceService = new GeofenceService();