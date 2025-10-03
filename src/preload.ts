import { contextBridge, ipcRenderer, webFrame } from 'electron';

const MINIMAL_FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana'];

let canvasPermissionGranted = false;
let fontPermissionGranted = false;
let currentUrl = '';

ipcRenderer.on('set-canvas-permission', (_event, allowed: boolean) => {
  canvasPermissionGranted = allowed;
});

ipcRenderer.on('set-font-permission', (_event, allowed: boolean) => {
  fontPermissionGranted = allowed;
});

webFrame.executeJavaScript(`
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
  if (event.source !== window) return;
  
  if (event.data.type === 'request-canvas-permission') {
    currentUrl = event.data.url;
    const allowed = await ipcRenderer.invoke('request-canvas-permission', currentUrl);
    canvasPermissionGranted = allowed;
    window.postMessage({ type: 'canvas-permission-update', allowed }, '*');
  } else if (event.data.type === 'request-font-permission') {
    currentUrl = event.data.url;
    const allowed = await ipcRenderer.invoke('request-font-permission', currentUrl);
    fontPermissionGranted = allowed;
    window.postMessage({ type: 'font-permission-update', allowed }, '*');
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  currentUrl = window.location.href;
  const permissions: any = await ipcRenderer.invoke('get-permissions', currentUrl);
  canvasPermissionGranted = permissions.canvas;
  fontPermissionGranted = permissions.fonts;
  
  window.postMessage({ type: 'canvas-permission-update', allowed: permissions.canvas }, '*');
  window.postMessage({ type: 'font-permission-update', allowed: permissions.fonts }, '*');
});

contextBridge.exposeInMainWorld('i2pBrowser', {
  version: process.versions.electron,
  toggleJavaScript: (url: string) => ipcRenderer.invoke('toggle-javascript', url),
  openI2PPortal: (portal: string) => ipcRenderer.send('open-i2p-portal', portal),
  newIdentity: () => ipcRenderer.send('new-identity')
});
