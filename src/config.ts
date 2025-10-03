import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export type SecurityLevel = 'Standard' | 'Safer' | 'Safest';

export interface AppPreferences {
  securityLevel: SecurityLevel;
  chromiumFlags: string[];
  proxySettings: {
    enabled: boolean;
    host: string;
    port: number;
    type: 'http' | 'socks5';
  };
}

const defaultPreferences: AppPreferences = {
  securityLevel: 'Standard',
  chromiumFlags: [],
  proxySettings: {
    enabled: false,
    host: '127.0.0.1',
    port: 4444,
    type: 'http'
  }
};

export class ConfigManager {
  private configPath: string;
  private preferences: AppPreferences;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'preferences.json');
    this.preferences = this.loadPreferences();
  }

  private loadPreferences(): AppPreferences {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return { ...defaultPreferences, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { ...defaultPreferences };
  }

  private savePreferences(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  getPreferences(): AppPreferences {
    return { ...this.preferences };
  }

  setSecurityLevel(level: SecurityLevel): void {
    this.preferences.securityLevel = level;
    this.savePreferences();
  }

  getSecurityLevel(): SecurityLevel {
    return this.preferences.securityLevel;
  }

  setProxySettings(settings: Partial<AppPreferences['proxySettings']>): void {
    this.preferences.proxySettings = { ...this.preferences.proxySettings, ...settings };
    this.savePreferences();
  }

  setChromiumFlags(flags: string[]): void {
    this.preferences.chromiumFlags = flags;
    this.savePreferences();
  }
}
