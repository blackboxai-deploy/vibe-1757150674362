export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  version: string; // Privacy policy version
  expiresAt?: string;
  revokedAt?: string;
  metadata?: Record<string, any>;
}

export enum ConsentType {
  LOCATION_TRACKING = 'location_tracking',
  DATA_PROCESSING = 'data_processing',
  DATA_SHARING = 'data_sharing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics'
}

export interface PrivacySettings {
  locationTracking: boolean;
  dataSharing: boolean;
  historicalData: boolean;
  realTimeTracking: boolean;
  geofenceAlerts: boolean;
  dataRetentionDays: number;
  exportEnabled: boolean;
  deletionEnabled: boolean;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  requestedAt: string;
  status: ExportStatus;
  dataTypes: string[];
  format: 'json' | 'csv' | 'pdf';
  downloadUrl?: string;
  expiresAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: string;
  status: DeletionStatus;
  dataTypes: string[];
  scheduledFor?: string;
  completedAt?: string;
  confirmationRequired: boolean;
  confirmationToken?: string;
  errorMessage?: string;
}

export enum DeletionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export class PrivacyService {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private privacySettings: Map<string, PrivacySettings> = new Map();

  /**
   * Request user consent for a specific type
   */
  async requestConsent(
    userId: string,
    consentType: ConsentType,
    metadata?: Record<string, any>
  ): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      id: this.generateId(),
      userId,
      consentType,
      granted: false, // Will be updated when user provides consent
      timestamp: new Date().toISOString(),
      ipAddress: await this.getUserIP(),
      userAgent: navigator.userAgent,
      version: this.getCurrentPrivacyPolicyVersion(),
      metadata
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(userId, userConsents);

    return consentRecord;
  }

  /**
   * Grant consent for a specific request
   */
  async grantConsent(
    consentId: string,
    userId: string,
    granted: boolean = true
  ): Promise<ConsentRecord> {
    const userConsents = this.consentRecords.get(userId) || [];
    const consentIndex = userConsents.findIndex(c => c.id === consentId);

    if (consentIndex === -1) {
      throw new Error('Consent record not found');
    }

    userConsents[consentIndex].granted = granted;
    userConsents[consentIndex].timestamp = new Date().toISOString();

    if (!granted) {
      userConsents[consentIndex].revokedAt = new Date().toISOString();
    }

    this.consentRecords.set(userId, userConsents);

    // Save to server
    await this.saveConsentRecord(userConsents[consentIndex]);

    return userConsents[consentIndex];
  }

  /**
   * Check if user has granted specific consent
   */
  hasConsent(userId: string, consentType: ConsentType): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestConsent) {
      return false;
    }

    // Check if consent has expired
    if (latestConsent.expiresAt && new Date(latestConsent.expiresAt) < new Date()) {
      return false;
    }

    return latestConsent.granted && !latestConsent.revokedAt;
  }

  /**
   * Revoke consent for a specific type
   */
  async revokeConsent(userId: string, consentType: ConsentType): Promise<void> {
    const userConsents = this.consentRecords.get(userId) || [];
    const activeConsents = userConsents.filter(
      c => c.consentType === consentType && c.granted && !c.revokedAt
    );

    for (const consent of activeConsents) {
      consent.granted = false;
      consent.revokedAt = new Date().toISOString();
      await this.saveConsentRecord(consent);
    }

    this.consentRecords.set(userId, userConsents);

    // Trigger data cleanup if necessary
    await this.handleConsentRevocation(userId, consentType);
  }

  /**
   * Get user's privacy settings
   */
  getPrivacySettings(userId: string): PrivacySettings {
    return this.privacySettings.get(userId) || {
      locationTracking: false,
      dataSharing: false,
      historicalData: false,
      realTimeTracking: false,
      geofenceAlerts: false,
      dataRetentionDays: 90,
      exportEnabled: true,
      deletionEnabled: true
    };
  }

  /**
   * Update user's privacy settings
   */
  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const currentSettings = this.getPrivacySettings(userId);
    const updatedSettings = { ...currentSettings, ...settings };

    this.privacySettings.set(userId, updatedSettings);

    // Save to server
    await this.savePrivacySettings(userId, updatedSettings);

    return updatedSettings;
  }

  /**
   * Request data export
   */
  async requestDataExport(
    userId: string,
    dataTypes: string[],
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<DataExportRequest> {
    const exportRequest: DataExportRequest = {
      id: this.generateId(),
      userId,
      requestedAt: new Date().toISOString(),
      status: ExportStatus.PENDING,
      dataTypes,
      format,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    // Send request to server
    try {
      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to request data export');
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw error;
    }
  }

  /**
   * Request data deletion
   */
  async requestDataDeletion(
    userId: string,
    dataTypes: string[],
    scheduledFor?: string
  ): Promise<DataDeletionRequest> {
    const deletionRequest: DataDeletionRequest = {
      id: this.generateId(),
      userId,
      requestedAt: new Date().toISOString(),
      status: DeletionStatus.PENDING,
      dataTypes,
      scheduledFor,
      confirmationRequired: true,
      confirmationToken: this.generateConfirmationToken()
    };

    // Send request to server
    try {
      const response = await fetch('/api/privacy/deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to request data deletion');
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      throw error;
    }
  }

  /**
   * Confirm data deletion request
   */
  async confirmDataDeletion(deletionId: string, confirmationToken: string): Promise<DataDeletionRequest> {
    try {
      const response = await fetch(`/api/privacy/deletion/${deletionId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationToken })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm data deletion');
      }

      return await response.json();
    } catch (error) {
      console.error('Error confirming data deletion:', error);
      throw error;
    }
  }

  /**
   * Get consent audit trail for a user
   */
  getConsentAuditTrail(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  /**
   * Check if data processing is compliant
   */
  isProcessingCompliant(userId: string, dataType: string): boolean {
    // Check if user has given appropriate consent
    const hasLocationConsent = this.hasConsent(userId, ConsentType.LOCATION_TRACKING);
    const hasDataProcessingConsent = this.hasConsent(userId, ConsentType.DATA_PROCESSING);

    switch (dataType) {
      case 'location':
        return hasLocationConsent;
      case 'analytics':
        return hasDataProcessingConsent && this.hasConsent(userId, ConsentType.ANALYTICS);
      case 'sharing':
        return hasDataProcessingConsent && this.hasConsent(userId, ConsentType.DATA_SHARING);
      default:
        return hasDataProcessingConsent;
    }
  }

  /**
   * Generate privacy report for user
   */
  async generatePrivacyReport(userId: string): Promise<{
    consents: ConsentRecord[];
    settings: PrivacySettings;
    dataTypes: string[];
    retentionInfo: Record<string, any>;
  }> {
    const consents = this.getConsentAuditTrail(userId);
    const settings = this.getPrivacySettings(userId);
    
    // Get data types being processed
    const dataTypes = await this.getDataTypesForUser(userId);
    
    // Get retention information
    const retentionInfo = await this.getDataRetentionInfo(userId);

    return {
      consents,
      settings,
      dataTypes,
      retentionInfo
    };
  }

  private async saveConsentRecord(consent: ConsentRecord): Promise<void> {
    try {
      await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(consent)
      });
    } catch (error) {
      console.error('Error saving consent record:', error);
    }
  }

  private async savePrivacySettings(userId: string, settings: PrivacySettings): Promise<void> {
    try {
      await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, settings })
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    }
  }

  private async handleConsentRevocation(userId: string, consentType: ConsentType): Promise<void> {
    switch (consentType) {
      case ConsentType.LOCATION_TRACKING:
        // Stop location tracking
        await fetch(`/api/location/stop-tracking/${userId}`, { method: 'POST' });
        break;
      case ConsentType.DATA_SHARING:
        // Remove from sharing systems
        await fetch(`/api/privacy/stop-sharing/${userId}`, { method: 'POST' });
        break;
      // Add other revocation handlers as needed
    }
  }

  private async getDataTypesForUser(userId: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/privacy/data-types/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get data types');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting data types:', error);
      return [];
    }
  }

  private async getDataRetentionInfo(userId: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`/api/privacy/retention/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get retention info');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting retention info:', error);
      return {};
    }
  }

  private async getUserIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting user IP:', error);
      return '0.0.0.0';
    }
  }

  private getCurrentPrivacyPolicyVersion(): string {
    return '1.0.0'; // This would be configurable
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateConfirmationToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const privacyService = new PrivacyService();