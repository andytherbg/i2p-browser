import { app, BrowserWindow } from 'electron';

export interface I2PProxyConfig {
  httpPort: number;
  socksPort: number;
}

const VIEWPORT_BUCKETS = [
  { width: 1000, height: 700 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 }
];

export function configureI2PProxy(httpPort: number = 4444, socksPort: number = 4447): string[] {
  const flags: string[] = [
    `--proxy-server=http://127.0.0.1:${httpPort}`,
    '--proxy-bypass-list=<-loopback>',
    
    '--disable-quic',
    
    '--disable-webrtc',
    '--enforce-webrtc-ip-permission-check',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    
    '--disable-features=WebBluetooth',
    '--disable-features=WebUSB',
    
    '--block-new-web-contents',
    
    '--no-pings',
    
    '--disable-local-storage',
    '--disable-databases',
    
    '--user-agent=Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0'
  ];

  return flags;
}

export function applyI2PProxyFlags(httpPort: number = 4444, socksPort: number = 4447): void {
  const flags = configureI2PProxy(httpPort, socksPort);
  
  flags.forEach(flag => {
    const [key, value] = flag.split('=');
    if (value) {
      app.commandLine.appendSwitch(key.replace('--', ''), value);
    } else {
      app.commandLine.appendSwitch(flag.replace('--', ''));
    }
  });
  
  console.log('Applied I2P proxy configuration:', { httpPort, socksPort });
  console.log('Chromium flags:', flags);
}

export function enforceViewportBuckets(window: BrowserWindow): void {
  const [width, height] = window.getSize();
  
  const closestBucket = VIEWPORT_BUCKETS.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.width - width) + Math.abs(prev.height - height);
    const currDiff = Math.abs(curr.width - width) + Math.abs(curr.height - height);
    return currDiff < prevDiff ? curr : prev;
  });
  
  if (width !== closestBucket.width || height !== closestBucket.height) {
    console.warn(
      `Window size ${width}x${height} does not match standard buckets. ` +
      `Closest bucket: ${closestBucket.width}x${closestBucket.height}. ` +
      `Using non-standard sizes may reduce privacy.`
    );
  }
  
  window.on('resize', () => {
    const [newWidth, newHeight] = window.getSize();
    const matchesBucket = VIEWPORT_BUCKETS.some(
      bucket => bucket.width === newWidth && bucket.height === newHeight
    );
    
    if (!matchesBucket) {
      console.warn(
        `WARNING: Window resized to non-standard size ${newWidth}x${newHeight}. ` +
        `This may reduce your privacy. Recommended sizes: ` +
        VIEWPORT_BUCKETS.map(b => `${b.width}x${b.height}`).join(', ')
      );
    }
  });
}

export function getProxyFlags(): string[] {
  const switches = app.commandLine.getSwitchValue('proxy-server');
  const allFlags: string[] = [];
  
  if (switches) {
    allFlags.push(`--proxy-server=${switches}`);
  }
  
  const flagsToCheck = [
    'disable-quic',
    'disable-webrtc',
    'user-agent',
    'proxy-bypass-list'
  ];
  
  flagsToCheck.forEach(flag => {
    const value = app.commandLine.getSwitchValue(flag);
    if (value) {
      allFlags.push(`--${flag}=${value}`);
    } else if (app.commandLine.hasSwitch(flag)) {
      allFlags.push(`--${flag}`);
    }
  });
  
  return allFlags;
}
