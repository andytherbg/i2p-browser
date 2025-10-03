export const MINIMAL_FONTS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Verdana'
];

export const canvasProtectionScript = `
(function() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  let canvasPermission = false;
  
  window.addEventListener('canvas-permission-response', (event) => {
    canvasPermission = event.detail.allowed;
  });
  
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    if (!canvasPermission) {
      const event = new CustomEvent('canvas-read-request', { detail: { url: window.location.href } });
      window.dispatchEvent(event);
      throw new Error('Canvas read blocked: Permission required');
    }
    return originalToDataURL.apply(this, args);
  };
  
  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    if (!canvasPermission) {
      const event = new CustomEvent('canvas-read-request', { detail: { url: window.location.href } });
      window.dispatchEvent(event);
      throw new Error('Canvas read blocked: Permission required');
    }
    return originalGetImageData.apply(this, args);
  };
  
  window.__setCanvasPermission = function(allowed) {
    canvasPermission = allowed;
  };
})();
`;

export const fontProtectionScript = `
(function() {
  const minimalFonts = ${JSON.stringify(MINIMAL_FONTS)};
  
  let fontPermission = false;
  
  window.addEventListener('font-permission-response', (event) => {
    fontPermission = event.detail.allowed;
  });
  
  if (document.fonts && document.fonts.check) {
    const originalCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = function(font, text) {
      if (!fontPermission) {
        const fontFamily = font.match(/['"]([^'"]+)['"]/);
        if (fontFamily && minimalFonts.includes(fontFamily[1])) {
          return originalCheck(font, text);
        }
        return false;
      }
      return originalCheck(font, text);
    };
  }
  
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(element, pseudoElt) {
    const style = originalGetComputedStyle(element, pseudoElt);
    if (!fontPermission) {
      const handler = {
        get: function(target, prop) {
          if (prop === 'fontFamily') {
            return minimalFonts[0];
          }
          return target[prop];
        }
      };
      return new Proxy(style, handler);
    }
    return style;
  };
  
  window.__setFontPermission = function(allowed) {
    fontPermission = allowed;
  };
})();
`;

export function getProtectionScripts(): string {
  return canvasProtectionScript + '\n' + fontProtectionScript;
}
