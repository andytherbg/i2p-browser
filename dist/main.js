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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("./config");
const i2p_proxy_1 = require("./i2p-proxy");
let mainWindow = null;
let configManager;
function applyChromiumFlags() {
    const prefs = configManager.getPreferences();
    prefs.chromiumFlags.forEach(flag => {
        const [key, value] = flag.split('=');
        if (value) {
            electron_1.app.commandLine.appendSwitch(key, value);
        }
        else {
            electron_1.app.commandLine.appendSwitch(flag);
        }
    });
    console.log('Applied Chromium flags:', prefs.chromiumFlags);
}
async function applyProxySettings() {
    const prefs = configManager.getPreferences();
    if (prefs.proxySettings.enabled) {
        const proxyConfig = {
            proxyRules: `${prefs.proxySettings.type}://${prefs.proxySettings.host}:${prefs.proxySettings.port}`
        };
        await electron_1.session.defaultSession.setProxy(proxyConfig);
        console.log('Applied proxy settings:', proxyConfig);
    }
}
function setContentSecurityPolicy() {
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
                ]
            }
        });
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true
        },
        title: 'I2P Browser'
    });
    (0, i2p_proxy_1.enforceViewportBuckets)(mainWindow);
    mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function createMenu() {
    const securityLevel = configManager.getSecurityLevel();
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        electron_1.app.quit();
                    }
                }
            ]
        },
        {
            label: 'Security',
            submenu: [
                {
                    label: 'Standard',
                    type: 'radio',
                    checked: securityLevel === 'Standard',
                    click: () => {
                        configManager.setSecurityLevel('Standard');
                        updateSecurityMenu();
                    }
                },
                {
                    label: 'Safer',
                    type: 'radio',
                    checked: securityLevel === 'Safer',
                    click: () => {
                        configManager.setSecurityLevel('Safer');
                        updateSecurityMenu();
                    }
                },
                {
                    label: 'Safest',
                    type: 'radio',
                    checked: securityLevel === 'Safest',
                    click: () => {
                        configManager.setSecurityLevel('Safest');
                        updateSecurityMenu();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        }
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
function updateSecurityMenu() {
    createMenu();
    console.log('Security level changed to:', configManager.getSecurityLevel());
}
configManager = new config_1.ConfigManager();
(0, i2p_proxy_1.applyI2PProxyFlags)(4444, 4447);
applyChromiumFlags();
electron_1.app.whenReady().then(async () => {
    setContentSecurityPolicy();
    await applyProxySettings();
    createWindow();
    createMenu();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
