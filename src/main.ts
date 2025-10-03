import { app, BrowserWindow, Menu, MenuItemConstructorOptions, session } from 'electron';
import * as path from 'path';
import { ConfigManager, SecurityLevel } from './config';

let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;

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
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
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

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function updateSecurityMenu(): void {
  createMenu();
  console.log('Security level changed to:', configManager.getSecurityLevel());
}

app.whenReady().then(() => {
  configManager = new ConfigManager();
  
  setContentSecurityPolicy();
  
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
