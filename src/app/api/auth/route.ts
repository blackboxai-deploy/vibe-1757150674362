import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole, Company, Session } from '@/types/user';

// Demo users for authentication
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@company.com',
    password: 'admin123', // In production, this would be hashed
    name: 'John Admin',
    role: UserRole.ADMIN,
    companyId: '1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    email: 'manager@company.com',
    password: 'manager123',
    name: 'Jane Manager',
    role: UserRole.MANAGER,
    companyId: '1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const DEMO_COMPANY: Company = {
  id: '1',
  name: 'Acme Corporation',
  address: 'New York, NY',
  timezone: 'America/New_York',
  settings: {
    trackingEnabled: true,
    workingHours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '17:00', enabled: false },
      sunday: { start: '09:00', end: '17:00', enabled: false }
    },
    geofencingEnabled: true,
    attendanceTracking: true,
    dataRetentionDays: 90,
    privacySettings: {
      requireConsent: true,
      allowDataExport: true,
      allowDataDeletion: true,
      showLocationHistory: true,
      shareLocationWithTeam: false
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = DEMO_USERS.find(u => u.email === email);
    
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Create session
    const session: Session = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive
      },
      company: DEMO_COMPANY,
      permissions: getPermissionsByRole(user.role),
      accessToken: generateAccessToken(user.id),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Set session cookie
    const response = NextResponse.json({ 
      message: 'Login successful',
      user: session.user,
      company: session.company
    });
    
    response.cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session: Session = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: session.user,
      company: session.company,
      permissions: session.permissions
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Logout successful' });
    
    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPermissionsByRole(role: UserRole) {
  const basePermissions = [
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'location', actions: ['read'] }
  ];

  switch (role) {
    case UserRole.ADMIN:
      return [
        ...basePermissions,
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'company', actions: ['read', 'update'] },
        { resource: 'geofences', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['read', 'export'] },
        { resource: 'settings', actions: ['read', 'update'] }
      ];
    
    case UserRole.MANAGER:
      return [
        ...basePermissions,
        { resource: 'users', actions: ['read', 'update'] },
        { resource: 'geofences', actions: ['read', 'update'] },
        { resource: 'reports', actions: ['read', 'export'] }
      ];
    
    case UserRole.EMPLOYEE:
      return [
        ...basePermissions,
        { resource: 'privacy', actions: ['read', 'update'] },
        { resource: 'consent', actions: ['read', 'update'] }
      ];
    
    default:
      return basePermissions;
  }
}

function generateAccessToken(userId: string): string {
  // In production, this would use a proper JWT library
  const payload = {
    userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}