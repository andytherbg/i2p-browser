import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface SitePermissions {
  javascript: boolean;
  canvas: boolean;
  fonts: boolean;
}

export interface PermissionsStore {
  [domain: string]: SitePermissions;
}

const defaultPermissions: SitePermissions = {
  javascript: true,
  canvas: false,
  fonts: false
};

export class PermissionsManager {
  private permissionsPath: string;
  private permissions: PermissionsStore;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.permissionsPath = path.join(userDataPath, 'permissions.json');
    this.permissions = this.loadPermissions();
  }

  private loadPermissions(): PermissionsStore {
    try {
      if (fs.existsSync(this.permissionsPath)) {
        const data = fs.readFileSync(this.permissionsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
    return {};
  }

  private savePermissions(): void {
    try {
      const dir = path.dirname(this.permissionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.permissionsPath, JSON.stringify(this.permissions, null, 2));
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  }

  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  getPermissions(url: string): SitePermissions {
    const domain = this.getDomain(url);
    return this.permissions[domain] || { ...defaultPermissions };
  }

  setPermission(url: string, permission: keyof SitePermissions, value: boolean): void {
    const domain = this.getDomain(url);
    if (!this.permissions[domain]) {
      this.permissions[domain] = { ...defaultPermissions };
    }
    this.permissions[domain][permission] = value;
    this.savePermissions();
  }

  toggleJavaScript(url: string): boolean {
    const domain = this.getDomain(url);
    const current = this.getPermissions(url);
    const newValue = !current.javascript;
    this.setPermission(url, 'javascript', newValue);
    return newValue;
  }

  clearAllPermissions(): void {
    this.permissions = {};
    this.savePermissions();
  }

  getAllDomains(): string[] {
    return Object.keys(this.permissions);
  }
}
