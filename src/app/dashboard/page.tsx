"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Demo data types
interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'idle' | 'offline';
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  geofence?: {
    name: string;
    type: 'workplace' | 'client_site' | 'restricted';
  };
  todayHours: number;
  batteryLevel?: number;
}

interface GeofenceData {
  id: string;
  name: string;
  type: 'workplace' | 'client_site' | 'restricted';
  occupants: number;
  violations: number;
  isActive: boolean;
}

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  geofences: number;
  todayViolations: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDemoMode] = useState(true); // For demo purposes
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeEmployees: 0,
    geofences: 0,
    todayViolations: 0
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [geofences, setGeofences] = useState<GeofenceData[]>([]);

  // Demo data initialization
  useEffect(() => {
    const demoEmployees: Employee[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        status: 'active',
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: 'Main Office, New York, NY',
          timestamp: new Date().toISOString()
        },
        geofence: {
          name: 'Main Office',
          type: 'workplace'
        },
        todayHours: 7.5,
        batteryLevel: 85
      },
      {
        id: '2',
        name: 'Mike Chen',
        email: 'mike.chen@company.com',
        status: 'active',
        location: {
          latitude: 40.7614,
          longitude: -73.9776,
          address: 'Client Site A, New York, NY',
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        geofence: {
          name: 'Client Site A',
          type: 'client_site'
        },
        todayHours: 8.2,
        batteryLevel: 92
      },
      {
        id: '3',
        name: 'Emma Davis',
        email: 'emma.davis@company.com',
        status: 'idle',
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: 'Coffee Shop, New York, NY',
          timestamp: new Date(Date.now() - 900000).toISOString()
        },
        todayHours: 6.0,
        batteryLevel: 67
      },
      {
        id: '4',
        name: 'James Wilson',
        email: 'james.wilson@company.com',
        status: 'offline',
        todayHours: 8.0
      },
      {
        id: '5',
        name: 'Lisa Brown',
        email: 'lisa.brown@company.com',
        status: 'active',
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: 'Home Office, Brooklyn, NY',
          timestamp: new Date(Date.now() - 120000).toISOString()
        },
        geofence: {
          name: 'Remote Work Zone',
          type: 'workplace'
        },
        todayHours: 7.8,
        batteryLevel: 78
      }
    ];

    const demoGeofences: GeofenceData[] = [
      {
        id: '1',
        name: 'Main Office',
        type: 'workplace',
        occupants: 1,
        violations: 0,
        isActive: true
      },
      {
        id: '2',
        name: 'Client Site A',
        type: 'client_site',
        occupants: 1,
        violations: 0,
        isActive: true
      },
      {
        id: '3',
        name: 'Remote Work Zone',
        type: 'workplace',
        occupants: 1,
        violations: 0,
        isActive: true
      },
      {
        id: '4',
        name: 'Restricted Area',
        type: 'restricted',
        occupants: 0,
        violations: 2,
        isActive: true
      }
    ];

    setEmployees(demoEmployees);
    setGeofences(demoGeofences);
    setStats({
      totalEmployees: demoEmployees.length,
      activeEmployees: demoEmployees.filter(e => e.status === 'active').length,
      geofences: demoGeofences.length,
      todayViolations: demoGeofences.reduce((sum, g) => sum + g.violations, 0)
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'idle': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Idle</Badge>;
      case 'offline': return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Offline</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getGeofenceTypeColor = (type: string) => {
    switch (type) {
      case 'workplace': return 'text-blue-600 bg-blue-100';
      case 'client_site': return 'text-green-600 bg-green-100';
      case 'restricted': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Location Dashboard</h1>
                <p className="text-xs text-slate-600">Acme Corporation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isDemoMode && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                  Demo Mode
                </Badge>
              )}
              <Button variant="outline" size="sm">
                Settings
              </Button>
              <Button variant="outline" size="sm">
                Privacy Center
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Notice */}
      {isDemoMode && (
        <div className="bg-orange-50 border-b border-orange-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Alert className="border-orange-200">
              <AlertDescription className="text-orange-800">
                <strong>Demo Mode:</strong> This dashboard shows sample data. In production, all location tracking would require explicit user consent and follow GDPR compliance.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-slate-600">
                {stats.activeEmployees} active now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tracking</CardTitle>
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEmployees}</div>
              <p className="text-xs text-slate-600">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geofences</CardTitle>
              <div className="w-4 h-4 bg-purple-600 rounded-lg"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.geofences}</div>
              <p className="text-xs text-slate-600">
                Active zones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Alerts</CardTitle>
              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayViolations}</div>
              <p className="text-xs text-slate-600">
                Geofence violations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="geofences">Geofences</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest location and geofence events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Mike Chen entered Client Site A</p>
                        <p className="text-xs text-slate-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sarah Johnson arrived at Main Office</p>
                        <p className="text-xs text-slate-600">3 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Unauthorized access detected at Restricted Area</p>
                        <p className="text-xs text-slate-600">4 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Employees Map Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Live Map View</CardTitle>
                  <CardDescription>Real-time employee locations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-100 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-slate-300 rounded-lg mx-auto mb-4"></div>
                    <h3 className="font-medium text-slate-900 mb-2">Interactive Map</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Real-time employee locations with geofence boundaries
                    </p>
                    <Button variant="outline" size="sm">
                      Open Full Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Employee Tracking</h2>
                <p className="text-slate-600">Monitor employee locations and status</p>
              </div>
              <Button>Add Employee</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map((employee) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      {getStatusBadge(employee.status)}
                    </div>
                    <CardDescription>{employee.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {employee.location && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Current Location</p>
                          <p className="text-sm text-slate-600">{employee.location.address}</p>
                          <p className="text-xs text-slate-500">
                            Updated {formatLastUpdate(employee.location.timestamp)}
                          </p>
                        </div>
                      )}
                      
                      {employee.geofence && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Current Zone</p>
                          <Badge className={`text-xs ${getGeofenceTypeColor(employee.geofence.type)}`}>
                            {employee.geofence.name}
                          </Badge>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Hours Today</p>
                          <p className="text-sm text-slate-600">{employee.todayHours}h</p>
                        </div>
                        {employee.batteryLevel && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">Battery</p>
                            <div className="flex items-center space-x-2">
                              <Progress value={employee.batteryLevel} className="w-16" />
                              <span className="text-xs text-slate-600">{employee.batteryLevel}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="geofences" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Geofence Management</h2>
                <p className="text-slate-600">Create and manage location boundaries</p>
              </div>
              <Button>Create Geofence</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {geofences.map((geofence) => (
                <Card key={geofence.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{geofence.name}</CardTitle>
                      <Badge className={getGeofenceTypeColor(geofence.type)}>
                        {geofence.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Current Occupants</p>
                          <p className="text-2xl font-bold text-blue-600">{geofence.occupants}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">Violations Today</p>
                          <p className={`text-2xl font-bold ${geofence.violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {geofence.violations}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${geofence.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <span className="text-sm text-slate-600">
                          {geofence.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Reports & Analytics</h2>
              <p className="text-slate-600">Generate reports and analyze location data</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Report</CardTitle>
                  <CardDescription>Employee time tracking and attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total Hours Today</span>
                      <span className="text-sm font-medium">37.5h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Average Hours/Employee</span>
                      <span className="text-sm font-medium">7.5h</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location Analytics</CardTitle>
                  <CardDescription>Movement patterns and location insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total Distance</span>
                      <span className="text-sm font-medium">127.3 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Site Visits</span>
                      <span className="text-sm font-medium">23</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Report</CardTitle>
                  <CardDescription>Privacy and compliance monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Consent Rate</span>
                      <span className="text-sm font-medium text-green-600">100%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Data Requests</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Compliance Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}