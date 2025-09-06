export interface Geofence {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: GeofenceType;
  shape: GeofenceShape;
  coordinates: GeofenceCoordinates;
  radius?: number; // for circular geofences
  isActive: boolean;
  notifications: GeofenceNotifications;
  workingHours?: GeofenceWorkingHours;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  color: string;
  opacity: number;
}

export enum GeofenceType {
  WORKPLACE = 'workplace',
  CLIENT_SITE = 'client_site',
  RESTRICTED = 'restricted',
  CUSTOM = 'custom'
}

export interface GeofenceShape {
  type: 'circle' | 'polygon';
}

export interface GeofenceCoordinates {
  center?: { latitude: number; longitude: number }; // for circles
  points?: Array<{ latitude: number; longitude: number }>; // for polygons
}

export interface GeofenceNotifications {
  onEntry: boolean;
  onExit: boolean;
  emailNotification: boolean;
  pushNotification: boolean;
  webhookUrl?: string;
  notifyUsers: string[]; // user IDs to notify
}

export interface GeofenceWorkingHours {
  enabled: boolean;
  schedule: {
    [key: string]: { start: string; end: string; active: boolean };
  };
}

export interface GeofenceEvent {
  id: string;
  userId: string;
  geofenceId: string;
  eventType: GeofenceEventType;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  duration?: number; // time spent inside geofence in minutes
  isWorkingHours: boolean;
  metadata?: Record<string, any>;
}

export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  DWELL = 'dwell' // staying in geofence for extended time
}

export interface GeofenceAnalytics {
  geofenceId: string;
  dateRange: { start: string; end: string };
  totalVisitors: number;
  totalEvents: number;
  averageDwellTime: number;
  peakHours: Array<{ hour: number; count: number }>;
  frequentVisitors: Array<{ userId: string; visitCount: number }>;
  compliance: {
    workingHoursViolations: number;
    unauthorizedAccess: number;
  };
}

export interface GeofenceStatus {
  userId: string;
  currentGeofences: Array<{
    geofenceId: string;
    entryTime: string;
    isAuthorized: boolean;
  }>;
  lastGeofenceExit?: {
    geofenceId: string;
    exitTime: string;
    duration: number;
  };
}

export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  type: GeofenceType;
  shape: GeofenceShape;
  coordinates: GeofenceCoordinates;
  radius?: number;
  notifications: GeofenceNotifications;
  workingHours?: GeofenceWorkingHours;
  color?: string;
}

export interface UpdateGeofenceRequest extends Partial<CreateGeofenceRequest> {
  isActive?: boolean;
}