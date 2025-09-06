export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastSeen?: string;
  profileImage?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export interface Company {
  id: string;
  name: string;
  address: string;
  timezone: string;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  trackingEnabled: boolean;
  workingHours: WorkingHours;
  geofencingEnabled: boolean;
  attendanceTracking: boolean;
  dataRetentionDays: number;
  privacySettings: PrivacySettings;
}

export interface WorkingHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

export interface PrivacySettings {
  requireConsent: boolean;
  allowDataExport: boolean;
  allowDataDeletion: boolean;
  showLocationHistory: boolean;
  shareLocationWithTeam: boolean;
}

export interface Session {
  user: User;
  company: Company;
  permissions: Permission[];
  accessToken: string;
  expiresAt: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
  role: UserRole;
}