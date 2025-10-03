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
const permissions_1 = require("./permissions");
let mainWindow = null;
let configManager;
let permissionsManager;
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
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(false);
            return;
        }
        callback(true);
    });
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        try {
            const requestUrl = new URL(details.url);
            const permissions = permissionsManager.getPermissions(details.url);
            const responseHeaders = details.responseHeaders || {};
            if (!permissions.javascript && details.resourceType === 'mainFrame') {
                responseHeaders['Content-Security-Policy'] = ["script-src 'none'; object-src 'none'"];
            }
            callback({ responseHeaders });
        }
        catch (error) {
            console.error('Error processing headers:', error);
            callback({});
        }
    });
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
                    label: 'New Identity',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        permissionsManager.clearAllPermissions();
                        if (mainWindow) {
                            mainWindow.webContents.session.clearCache();
                            mainWindow.webContents.session.clearStorageData({
                                storages: ['cookies', 'localstorage', 'indexdb']
                            });
                            electron_1.dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'New Identity',
                                message: 'Your browser identity has been reset.\n\nAll permissions, cookies, and cache have been cleared.',
                                buttons: ['OK']
                            }).then(() => {
                                mainWindow?.reload();
                            });
                        }
                    }
                },
                { type: 'separator' },
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
            label: 'I2P',
            submenu: [
                {
                    label: 'Postman HQ',
                    click: () => {
                        mainWindow?.loadURL('http://hq.postman.i2p');
                    }
                },
                {
                    label: 'Stats',
                    click: () => {
                        mainWindow?.loadURL('http://stats.i2p');
                    }
                },
                {
                    label: 'IRC',
                    click: () => {
                        mainWindow?.loadURL('http://irc.echelon.i2p');
                    }
                },
                {
                    label: 'Forum',
                    click: () => {
                        mainWindow?.loadURL('http://i2pforum.i2p');
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
                },
                { type: 'separator' },
                {
                    label: 'Toggle JavaScript (Current Site)',
                    accelerator: 'CmdOrCtrl+J',
                    click: () => {
                        if (mainWindow) {
                            const url = mainWindow.webContents.getURL();
                            permissionsManager.toggleJavaScript(url);
                            mainWindow.reload();
                        }
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
function setupIPCHandlers() {
    electron_1.ipcMain.handle('get-permissions', async (event, url) => {
        if (typeof url !== 'string' || url.length === 0) {
            return { javascript: true, canvas: false, fonts: false };
        }
        return permissionsManager.getPermissions(url);
    });
    electron_1.ipcMain.handle('request-canvas-permission', async (event, url) => {
        if (typeof url !== 'string' || url.length === 0 || !mainWindow) {
            return false;
        }
        try {
            new URL(url);
        }
        catch {
            return false;
        }
        const result = await electron_1.dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Canvas Read Request',
            message: `A website wants to read canvas data.\n\nURL: ${url}\n\nThis could be used for fingerprinting.`,
            buttons: ['Block', 'Allow Once', 'Always Allow'],
            defaultId: 0
        });
        const allowed = result.response > 0;
        if (result.response === 2) {
            permissionsManager.setPermission(url, 'canvas', true);
        }
        if (allowed && mainWindow) {
            mainWindow.webContents.send('set-canvas-permission', true);
        }
        return allowed;
    });
    electron_1.ipcMain.handle('request-font-permission', async (event, url) => {
        if (typeof url !== 'string' || url.length === 0 || !mainWindow) {
            return false;
        }
        try {
            new URL(url);
        }
        catch {
            return false;
        }
        const result = await electron_1.dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Font Access Request',
            message: `A website wants to access system fonts.\n\nURL: ${url}\n\nThis could be used for fingerprinting.`,
            buttons: ['Block', 'Allow Once', 'Always Allow'],
            defaultId: 0
        });
        const allowed = result.response > 0;
        if (result.response === 2) {
            permissionsManager.setPermission(url, 'fonts', true);
        }
        if (allowed && mainWindow) {
            mainWindow.webContents.send('set-font-permission', true);
        }
        return allowed;
    });
    electron_1.ipcMain.handle('toggle-javascript', async (event, url) => {
        if (typeof url !== 'string' || url.length === 0) {
            return false;
        }
        try {
            new URL(url);
        }
        catch {
            return false;
        }
        const newValue = permissionsManager.toggleJavaScript(url);
        return newValue;
    });
    electron_1.ipcMain.on('open-i2p-portal', (event, portal) => {
        if (typeof portal !== 'string' || portal.length === 0) {
            return;
        }
        const allowedPortals = {
            'postman': 'http://hq.postman.i2p',
            'stats': 'http://stats.i2p',
            'IRC': 'http://irc.echelon.i2p',
            'forum': 'http://i2pforum.i2p'
        };
        const url = allowedPortals[portal];
        if (url && mainWindow) {
            mainWindow.loadURL(url);
        }
    });
    electron_1.ipcMain.on('new-identity', () => {
        permissionsManager.clearAllPermissions();
        if (mainWindow) {
            mainWindow.webContents.session.clearCache();
            mainWindow.webContents.session.clearStorageData({
                storages: ['cookies', 'localstorage', 'indexdb']
            });
            electron_1.dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'New Identity',
                message: 'Your browser identity has been reset.\n\nAll permissions, cookies, and cache have been cleared.',
                buttons: ['OK']
            }).then(() => {
                mainWindow?.reload();
            });
        }
    });
}
configManager = new config_1.ConfigManager();
permissionsManager = new permissions_1.PermissionsManager();
(0, i2p_proxy_1.applyI2PProxyFlags)(4444, 4447);
applyChromiumFlags();
electron_1.app.whenReady().then(async () => {
    setupIPCHandlers();
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
