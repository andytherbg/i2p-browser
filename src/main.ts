import { app, BrowserWindow, Menu, MenuItemConstructorOptions, session, dialog, ipcMain } from 'electron';
import * as path from 'path';
import { ConfigManager, SecurityLevel } from './config';
import { applyI2PProxyFlags, enforceViewportBuckets } from './i2p-proxy';
import { PermissionsManager } from './permissions';

let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let permissionsManager: PermissionsManager;

function applyChromiumFlags(): void {
  const prefs = configManager.getPreferences();
  prefs.chromiumFlags.forEach(flag => {
    const [key, value] = flag.split('=');
    if (value) {
      app.commandLine.appendSwitch(key, value);
    } else {
      app.commandLine.appendSwitch(flag);
    }
  });
  console.log('Applied Chromium flags:', prefs.chromiumFlags);
}

async function applyProxySettings(): Promise<void> {
  const prefs = configManager.getPreferences();
  if (prefs.proxySettings.enabled) {
    const proxyConfig = {
      proxyRules: `${prefs.proxySettings.type}://${prefs.proxySettings.host}:${prefs.proxySettings.port}`
    };
    await session.defaultSession.setProxy(proxyConfig);
    console.log('Applied proxy settings:', proxyConfig);
  }
}

function setContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  enforceViewportBuckets(mainWindow);

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
    } catch (error) {
      console.error('Error processing headers:', error);
      callback({});
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu(): void {
  const securityLevel = configManager.getSecurityLevel();

  const template: MenuItemConstructorOptions[] = [
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
              dialog.showMessageBox(mainWindow, {
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
            app.quit();
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

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function updateSecurityMenu(): void {
  createMenu();
  console.log('Security level changed to:', configManager.getSecurityLevel());
}

function setupIPCHandlers(): void {
  ipcMain.handle('get-permissions', async (event, url: string) => {
    if (typeof url !== 'string' || url.length === 0) {
      return { javascript: true, canvas: false, fonts: false };
    }
    return permissionsManager.getPermissions(url);
  });

  ipcMain.handle('request-canvas-permission', async (event, url: string) => {
    if (typeof url !== 'string' || url.length === 0 || !mainWindow) {
      return false;
    }
    
    try {
      new URL(url);
    } catch {
      return false;
    }
    
    const result = await dialog.showMessageBox(mainWindow, {
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

  ipcMain.handle('request-font-permission', async (event, url: string) => {
    if (typeof url !== 'string' || url.length === 0 || !mainWindow) {
      return false;
    }
    
    try {
      new URL(url);
    } catch {
      return false;
    }
    
    const result = await dialog.showMessageBox(mainWindow, {
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

  ipcMain.handle('toggle-javascript', async (event, url: string) => {
    if (typeof url !== 'string' || url.length === 0) {
      return false;
    }
    
    try {
      new URL(url);
    } catch {
      return false;
    }
    
    const newValue = permissionsManager.toggleJavaScript(url);
    return newValue;
  });

  ipcMain.on('open-i2p-portal', (event, portal: string) => {
    if (typeof portal !== 'string' || portal.length === 0) {
      return;
    }
    
    const allowedPortals: { [key: string]: string } = {
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

  ipcMain.on('new-identity', () => {
    permissionsManager.clearAllPermissions();
    
    if (mainWindow) {
      mainWindow.webContents.session.clearCache();
      mainWindow.webContents.session.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb']
      });
      
      dialog.showMessageBox(mainWindow, {
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

configManager = new ConfigManager();
permissionsManager = new PermissionsManager();

applyI2PProxyFlags(4444, 4447);

applyChromiumFlags();

app.whenReady().then(async () => {
  setupIPCHandlers();
  setContentSecurityPolicy();
  await applyProxySettings();
  
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
