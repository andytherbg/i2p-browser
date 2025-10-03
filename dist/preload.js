"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const MINIMAL_FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana'];
let canvasPermissionGranted = false;
let fontPermissionGranted = false;
let currentUrl = '';
electron_1.ipcRenderer.on('set-canvas-permission', (_event, allowed) => {
    canvasPermissionGranted = allowed;
});
electron_1.ipcRenderer.on('set-font-permission', (_event, allowed) => {
    fontPermissionGranted = allowed;
});
electron_1.webFrame.executeJavaScript(`
  (function() {
    const MINIMAL_FONTS = ${JSON.stringify(MINIMAL_FONTS)};
    let canvasPermissionGranted = false;
    let fontPermissionGranted = false;
    
    window.addEventListener('message', (event) => {
      if (event.data.type === 'canvas-permission-update') {
        canvasPermissionGranted = event.data.allowed;
      } else if (event.data.type === 'font-permission-update') {
        fontPermissionGranted = event.data.allowed;
      }
    });
    
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      if (!canvasPermissionGranted) {
        window.postMessage({ type: 'request-canvas-permission', url: window.location.href }, '*');
        throw new Error('Canvas read blocked: Permission required');
      }
      return originalToDataURL.call(this, type, quality);
    };
    
    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh, settings) {
      if (!canvasPermissionGranted) {
        window.postMessage({ type: 'request-canvas-permission', url: window.location.href }, '*');
        throw new Error('Canvas read blocked: Permission required');
      }
      return originalGetImageData.call(this, sx, sy, sw, sh, settings);
    };
    
    if (document.fonts && document.fonts.check) {
      const originalCheck = document.fonts.check.bind(document.fonts);
      document.fonts.check = function(font, text) {
        if (!fontPermissionGranted) {
          const fontFamily = font.match(/['"]([^'"]+)['"]/);
          if (fontFamily && MINIMAL_FONTS.includes(fontFamily[1])) {
            return originalCheck(font, text);
          }
          window.postMessage({ type: 'request-font-permission', url: window.location.href }, '*');
          return false;
        }
        return originalCheck(font, text);
      };
    }
    
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(element, pseudoElt) {
      const style = originalGetComputedStyle.call(window, element, pseudoElt);
      if (!fontPermissionGranted) {
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'fontFamily') {
              return MINIMAL_FONTS[0];
            }
            return target[prop];
          }
        });
      }
      return style;
    };
  })();
`, true);
window.addEventListener('message', async (event) => {
    if (event.source !== window)
        return;
    if (event.data.type === 'request-canvas-permission') {
        currentUrl = event.data.url;
        const allowed = await electron_1.ipcRenderer.invoke('request-canvas-permission', currentUrl);
        canvasPermissionGranted = allowed;
        window.postMessage({ type: 'canvas-permission-update', allowed }, '*');
    }
    else if (event.data.type === 'request-font-permission') {
        currentUrl = event.data.url;
        const allowed = await electron_1.ipcRenderer.invoke('request-font-permission', currentUrl);
        fontPermissionGranted = allowed;
        window.postMessage({ type: 'font-permission-update', allowed }, '*');
    }
});
window.addEventListener('DOMContentLoaded', async () => {
    currentUrl = window.location.href;
    const permissions = await electron_1.ipcRenderer.invoke('get-permissions', currentUrl);
    canvasPermissionGranted = permissions.canvas;
    fontPermissionGranted = permissions.fonts;
    window.postMessage({ type: 'canvas-permission-update', allowed: permissions.canvas }, '*');
    window.postMessage({ type: 'font-permission-update', allowed: permissions.fonts }, '*');
});
electron_1.ipcRenderer.on('update-available', (_event, info) => {
    window.dispatchEvent(new CustomEvent('update-available', { detail: info }));
});
electron_1.ipcRenderer.on('update-download-progress', (_event, progress) => {
    window.dispatchEvent(new CustomEvent('update-download-progress', { detail: progress }));
});
electron_1.ipcRenderer.on('update-ready', (_event, info) => {
    window.dispatchEvent(new CustomEvent('update-ready', { detail: info }));
});
electron_1.ipcRenderer.on('update-error', (_event, error) => {
    window.dispatchEvent(new CustomEvent('update-error', { detail: error }));
});
electron_1.ipcRenderer.on('i2pd-update-available', (_event, info) => {
    window.dispatchEvent(new CustomEvent('i2pd-update-available', { detail: info }));
});
electron_1.ipcRenderer.on('i2pd-update-ready', (_event, info) => {
    window.dispatchEvent(new CustomEvent('i2pd-update-ready', { detail: info }));
});
electron_1.contextBridge.exposeInMainWorld('i2pBrowser', {
    version: process.versions.electron,
    toggleJavaScript: (url) => electron_1.ipcRenderer.invoke('toggle-javascript', url),
    openI2PPortal: (portal) => electron_1.ipcRenderer.send('open-i2p-portal', portal),
    newIdentity: () => electron_1.ipcRenderer.send('new-identity'),
    checkForUpdates: () => electron_1.ipcRenderer.send('check-for-updates'),
    downloadUpdate: () => electron_1.ipcRenderer.send('download-update'),
    installUpdate: () => electron_1.ipcRenderer.send('install-update'),
    checkI2pdUpdate: () => electron_1.ipcRenderer.send('check-i2pd-update'),
    downloadI2pdUpdate: (version) => electron_1.ipcRenderer.invoke('download-i2pd-update', version)
});
