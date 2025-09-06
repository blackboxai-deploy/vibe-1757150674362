export interface LocationData {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
  isManual: boolean;
  source: LocationSource;
  speed?: number;
  heading?: number;
  altitude?: number;
}

export enum LocationSource {
  GPS = 'gps',
  NETWORK = 'network',
  MANUAL = 'manual',
  GEOFENCE = 'geofence'
}

export interface LocationHistory {
  userId: string;
  locations: LocationData[];
  dateRange: {
    start: string;
    end: string;
  };
  totalDistance: number;
  timeActive: number;
}

export interface LiveLocation {
  userId: string;
  location: LocationData;
  status: LocationStatus;
  lastUpdate: string;
  batteryLevel?: number;
}

export enum LocationStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

export interface LocationPermissions {
  userId: string;
  hasConsented: boolean;
  consentDate?: string;
  permissionLevel: PermissionLevel;
  trackingEnabled: boolean;
  sharingEnabled: boolean;
  historyEnabled: boolean;
  canRevoke: boolean;
}

export enum PermissionLevel {
  NONE = 'none',
  BASIC = 'basic',
  FULL = 'full'
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  source: LocationSource;
  speed?: number;
  heading?: number;
  altitude?: number;
}

export interface LocationQueryParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  includeAddress?: boolean;
}

export interface DistanceCalculation {
  fromLocation: LocationData;
  toLocation: LocationData;
  distance: number;
  unit: 'meters' | 'kilometers' | 'miles';
}

export interface LocationStats {
  userId: string;
  dateRange: { start: string; end: string };
  totalDistance: number;
  totalTime: number;
  averageSpeed: number;
  locationsRecorded: number;
  geofenceEvents: number;
  attendanceEvents: number;
}