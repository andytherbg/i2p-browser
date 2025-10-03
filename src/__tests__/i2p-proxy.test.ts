import { configureI2PProxy } from '../i2p-proxy';

describe('configureI2PProxy', () => {
  it('should return an array of Chromium flags', () => {
    const flags = configureI2PProxy();
    expect(Array.isArray(flags)).toBe(true);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('should configure HTTP proxy with default port 4444', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--proxy-server=http://127.0.0.1:4444');
  });

  it('should configure HTTP proxy with custom port', () => {
    const flags = configureI2PProxy(8080);
    expect(flags).toContain('--proxy-server=http://127.0.0.1:8080');
  });

  it('should disable QUIC protocol', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--disable-quic');
  });

  it('should disable WebRTC', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--disable-webrtc');
    expect(flags).toContain('--enforce-webrtc-ip-permission-check');
    expect(flags).toContain('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
  });

  it('should disable WebBluetooth and WebUSB in a single flag', () => {
    const flags = configureI2PProxy();
    const disableFeatures = flags.find(flag => flag.includes('disable-features'));
    expect(disableFeatures).toBeDefined();
    expect(disableFeatures).toContain('WebBluetooth');
    expect(disableFeatures).toContain('WebUSB');
    expect(disableFeatures).toBe('--disable-features=WebBluetooth,WebUSB');
  });

  it('should set normalized Firefox user agent', () => {
    const flags = configureI2PProxy();
    const userAgentFlag = flags.find(flag => flag.startsWith('--user-agent='));
    expect(userAgentFlag).toBeDefined();
    expect(userAgentFlag).toContain('Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0');
  });

  it('should disable local network access', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--block-new-web-contents');
    const hostResolverFlag = flags.find(flag => flag.includes('host-resolver-rules'));
    expect(hostResolverFlag).toBeDefined();
    expect(hostResolverFlag).toContain('MAP * ~NOTFOUND');
    expect(hostResolverFlag).toContain('EXCLUDE localhost');
  });

  it('should set proxy bypass list', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--proxy-bypass-list=<-loopback>');
  });

  it('should disable local storage and databases', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--disable-local-storage');
    expect(flags).toContain('--disable-databases');
  });

  it('should disable pings', () => {
    const flags = configureI2PProxy();
    expect(flags).toContain('--no-pings');
  });

  it('should return same flags for both httpPort and socksPort parameters', () => {
    const flags1 = configureI2PProxy(4444, 4447);
    const flags2 = configureI2PProxy(5555, 6666);
    
    expect(flags1.length).toBe(flags2.length);
    
    expect(flags1[0]).toContain('127.0.0.1:4444');
    expect(flags2[0]).toContain('127.0.0.1:5555');
  });
});

describe('I2P Proxy Security Configuration', () => {
  it('should configure all required security flags', () => {
    const flags = configureI2PProxy();
    
    const requiredFlags = [
      'proxy-server',
      'disable-quic',
      'disable-webrtc',
      'WebBluetooth',
      'WebUSB',
      'user-agent',
      'host-resolver-rules'
    ];
    
    requiredFlags.forEach(requiredFlag => {
      const hasFlag = flags.some(flag => flag.includes(requiredFlag));
      expect(hasFlag).toBe(true);
    });
  });

  it('should normalize user agent regardless of input parameters', () => {
    const flags1 = configureI2PProxy(4444, 4447);
    const flags2 = configureI2PProxy(8080, 9050);
    
    const ua1 = flags1.find(f => f.includes('user-agent'));
    const ua2 = flags2.find(f => f.includes('user-agent'));
    
    expect(ua1).toEqual(ua2);
    expect(ua1).toContain('Firefox/102.0');
  });

  it('should only have one disable-features flag combining all features', () => {
    const flags = configureI2PProxy();
    const disableFeatureFlags = flags.filter(flag => flag.includes('disable-features'));
    expect(disableFeatureFlags.length).toBe(1);
    expect(disableFeatureFlags[0]).toContain('WebBluetooth,WebUSB');
  });

  it('should configure local network blocking via host-resolver-rules', () => {
    const flags = configureI2PProxy();
    const hostResolverFlag = flags.find(flag => flag.startsWith('--host-resolver-rules='));
    expect(hostResolverFlag).toBeDefined();
    expect(hostResolverFlag).toMatch(/MAP \* ~NOTFOUND/);
    expect(hostResolverFlag).toMatch(/EXCLUDE localhost/);
  });
});
