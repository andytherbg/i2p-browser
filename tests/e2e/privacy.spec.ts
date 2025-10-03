import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';

test.describe('I2P Browser Privacy Protections', () => {
  test('should block WebRTC', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    
    const testPagePath = 'file://' + path.join(__dirname, 'test-page.html');
    await window.goto(testPagePath);
    
    await window.waitForTimeout(1000);
    
    const webrtcAvailable = await window.getAttribute('#webrtc-result', 'data-webrtc-available');
    expect(webrtcAvailable).toBe('false');
    
    const resultText = await window.textContent('#webrtc-result');
    expect(resultText).toContain('PASS');
    
    await app.close();
  });

  test('should block canvas fingerprinting without permission', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    
    const testPagePath = 'file://' + path.join(__dirname, 'test-page.html');
    await window.goto(testPagePath);
    
    await window.waitForTimeout(1000);
    
    await window.click('#canvas-read-btn');
    
    await window.waitForTimeout(500);
    
    const canvasBlocked = await window.getAttribute('#canvas-result', 'data-canvas-blocked');
    expect(canvasBlocked).toBe('true');
    
    const resultText = await window.textContent('#canvas-result');
    expect(resultText).toContain('PASS');
    expect(resultText).toContain('blocked');
    
    await app.close();
  });

  test('should restrict font access to minimal list', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    
    const testPagePath = 'file://' + path.join(__dirname, 'test-page.html');
    await window.goto(testPagePath);
    
    await window.waitForTimeout(1000);
    
    await window.click('#font-test-btn');
    
    await window.waitForTimeout(500);
    
    const fontCount = await window.getAttribute('#font-result', 'data-font-count');
    expect(parseInt(fontCount || '0')).toBeLessThanOrEqual(4);
    
    const resultText = await window.textContent('#font-result');
    expect(resultText).toContain('PASS');
    
    await app.close();
  });

  test('should spoof getComputedStyle fontFamily', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    
    const testPagePath = 'file://' + path.join(__dirname, 'test-page.html');
    await window.goto(testPagePath);
    
    await window.waitForTimeout(1000);
    
    const computedFont = await window.getAttribute('#font-list-result', 'data-computed-font');
    expect(computedFont).toContain('Arial');
    
    const resultText = await window.textContent('#font-list-result');
    expect(resultText).toContain('PASS');
    
    await app.close();
  });

  test('should have New Identity menu item', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    await window.waitForTimeout(1000);
    
    const menu = await app.evaluate(async ({ Menu }) => {
      const appMenu = Menu.getApplicationMenu();
      if (!appMenu) return null;
      
      const fileMenu = appMenu.items.find((item: any) => item.label === 'File');
      if (!fileMenu || !fileMenu.submenu) return null;
      
      const newIdentityItem = fileMenu.submenu.items.find((item: any) => 
        item.label === 'New Identity'
      );
      
      return newIdentityItem ? { label: newIdentityItem.label } : null;
    }, { Menu: require('electron').Menu });
    
    expect(menu).not.toBeNull();
    expect(menu?.label).toBe('New Identity');
    
    await app.close();
  });

  test('should have I2P portal menu items', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')]
    });
    
    const window = await app.firstWindow();
    await window.waitForTimeout(1000);
    
    const menu = await app.evaluate(async ({ Menu }) => {
      const appMenu = Menu.getApplicationMenu();
      if (!appMenu) return null;
      
      const i2pMenu = appMenu.items.find((item: any) => item.label === 'I2P');
      if (!i2pMenu || !i2pMenu.submenu) return null;
      
      return i2pMenu.submenu.items.map((item: any) => item.label);
    }, { Menu: require('electron').Menu });
    
    expect(menu).toContain('Postman HQ');
    expect(menu).toContain('Stats');
    expect(menu).toContain('IRC');
    expect(menu).toContain('Forum');
    
    await app.close();
  });
});
