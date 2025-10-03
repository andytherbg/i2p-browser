"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const defaultPreferences = {
    securityLevel: 'Standard',
    chromiumFlags: [],
    proxySettings: {
        enabled: false,
        host: '127.0.0.1',
        port: 4444,
        type: 'http'
    }
};
class ConfigManager {
    constructor() {
        const userDataPath = electron_1.app.getPath('userData');
        this.configPath = path.join(userDataPath, 'preferences.json');
        this.preferences = this.loadPreferences();
    }
    loadPreferences() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                return { ...defaultPreferences, ...JSON.parse(data) };
            }
        }
        catch (error) {
            console.error('Error loading preferences:', error);
        }
        return { ...defaultPreferences };
    }
    savePreferences() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.preferences, null, 2));
        }
        catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    getPreferences() {
        return { ...this.preferences };
    }
    setSecurityLevel(level) {
        this.preferences.securityLevel = level;
        this.savePreferences();
    }
    getSecurityLevel() {
        return this.preferences.securityLevel;
    }
    setProxySettings(settings) {
        this.preferences.proxySettings = { ...this.preferences.proxySettings, ...settings };
        this.savePreferences();
    }
    setChromiumFlags(flags) {
        this.preferences.chromiumFlags = flags;
        this.savePreferences();
    }
}
exports.ConfigManager = ConfigManager;
