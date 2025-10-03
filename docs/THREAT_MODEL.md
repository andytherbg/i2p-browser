# Threat Model and Hardening Rationale

## Overview

I2P Browser is designed for users who require strong privacy guarantees when browsing the I2P network. This document outlines the threat model, attack vectors, and security hardening decisions.

## Threat Actors

### In Scope

1. **Network Adversaries**
   - Passive observers monitoring network traffic
   - Active attackers performing man-in-the-middle attacks
   - ISPs and network operators

2. **Malicious Websites**
   - Fingerprinting scripts attempting to identify users
   - Tracking pixels and cookies
   - JavaScript-based attacks (XSS, CSRF)

3. **Local Attackers**
   - Forensic analysts with physical device access
   - Malware on the same system attempting privilege escalation
   - Users sharing the same computer

### Out of Scope

1. **State-Level Adversaries** with unlimited resources
2. **Physical attacks** requiring hardware modifications
3. **Social engineering** attacks targeting users directly
4. **Zero-day exploits** in Electron or Chromium (mitigated through updates)

## Attack Vectors

### 1. Browser Fingerprinting

**Threat:** Websites can uniquely identify users through browser characteristics.

**Mitigations:**
- **Canvas API Protection**: User consent required before canvas read operations
- **Font Enumeration Restriction**: Limited to 4 common fonts (Arial, Times New Roman, Courier New, Verdana)
- **WebRTC Disabled**: Prevents IP address leaks
- **User Agent Normalization**: All users present as Firefox 102
- **Viewport Bucketing**: Screen resolution normalized to common sizes (1000x700, 1280x720, 1366x768, 1920x1080)

**Rationale:** Browser fingerprinting is a persistent tracking mechanism that survives cookie deletion. By limiting API access and normalizing identifiable characteristics, we reduce uniqueness across users.

### 2. JavaScript-Based Attacks

**Threat:** Malicious JavaScript can exploit vulnerabilities or track users.

**Mitigations:**
- **Per-Site JavaScript Toggle**: CSP-based blocking (`script-src 'none'`) prevents ALL script execution
- **Content Security Policy**: Enforced at HTTP response level, blocking inline scripts, eval(), and network scripts
- **Renderer Process Isolation**: Chromium's process-per-site architecture with context isolation

**Rationale:** JavaScript is the primary attack vector for web-based exploits. Our CSP-based approach blocks scripts before the browser engine can execute them, providing defense-in-depth beyond traditional NoScript-style URL blocking.

### 3. Network Traffic Analysis

**Threat:** Network observers can correlate traffic patterns to deanonymize users.

**Mitigations:**
- **I2P Proxy Integration**: All traffic routed through I2P HTTP proxy (default: 127.0.0.1:4444)
- **SOCKS5 Support**: Alternative proxy configuration for advanced setups
- **No Direct Connections**: Chromium flags prevent bypass of proxy settings

**Rationale:** I2P provides strong anonymity guarantees through onion routing. By forcing all traffic through the proxy and blocking direct connections, we prevent accidental deanonymization.

### 4. Persistent Tracking

**Threat:** Cookies, localStorage, and cached data enable cross-session tracking.

**Mitigations:**
- **New Identity Function**: Single-click clearing of cookies, cache, localStorage, and all permissions
- **Per-Site Permissions**: Granular control over JavaScript, canvas, and font access
- **Session Isolation**: Each security level change or New Identity click creates a fresh browser state

**Rationale:** Even with strong fingerprinting protections, persistent identifiers can link sessions. The New Identity function provides Tor Browser-style state reset without requiring a restart.

### 5. Supply Chain Attacks

**Threat:** Compromised dependencies or build artifacts.

**Mitigations:**
- **Ed25519 Signature Verification**: All updates verified before installation using embedded public key
- **Deterministic Builds**: Docker-based reproducible builds with SOURCE_DATE_EPOCH
- **Software Bill of Materials**: CycloneDX SBOM published with each release
- **npm Lockfile**: package-lock.json ensures consistent dependency versions
- **GitHub Actions**: Automated builds prevent manual tampering

**Rationale:** Users must trust that downloaded binaries match source code. Deterministic builds allow independent verification, while signature checks prevent distribution of malicious updates.

### 6. Malicious Updates

**Threat:** Attacker compromises update server and distributes backdoored versions.

**Mitigations:**
- **Cryptographic Signatures**: Ed25519 signatures required for all updates
- **Public Key Embedding**: Verification key compiled into application binary
- **GitHub Releases**: Updates distributed through GitHub's infrastructure
- **Manual Key Management**: Secret key stored offline, used only during release signing

**Rationale:** Auto-updaters are a high-value target. By requiring cryptographic signatures verified with a hardcoded public key, we prevent update hijacking even if GitHub accounts are compromised.

### 7. Data Exfiltration

**Threat:** Malicious websites attempt to steal sensitive information.

**Mitigations:**
- **Sandbox Architecture**: Renderer processes run with restricted permissions
- **No Node Integration**: Web content cannot access Node.js APIs
- **Context Isolation**: Preload scripts use contextBridge for controlled API exposure
- **Permission Dialogs**: User confirmation required for sensitive operations

**Rationale:** Chromium's sandbox provides strong isolation between web content and system resources. Our preload architecture ensures web pages cannot access privileged APIs without explicit user consent.

### 8. Cross-Site Request Forgery (CSRF)

**Threat:** Malicious sites trigger authenticated requests to other sites.

**Mitigations:**
- **Same-Origin Policy**: Chromium enforces strict origin isolation
- **Content Security Policy**: Limits which resources pages can load
- **Per-Site JavaScript Blocking**: Prevents CSRF scripts from executing

**Rationale:** Modern browsers have strong CSRF protections built-in. Our additional CSP layers provide defense-in-depth.

## Security Levels

### Standard
- Default browser security
- JavaScript enabled by default
- Suitable for general I2P browsing

### Safer
- Enhanced fingerprinting protections active
- Permission prompts for sensitive APIs
- Recommended for privacy-conscious users

### Safest
- Maximum security hardening
- JavaScript disabled by default
- May break some websites
- Recommended for high-threat environments

## Known Limitations

### 1. Electron/Chromium Vulnerabilities
**Impact:** Browser engine vulnerabilities could lead to sandbox escapes.
**Mitigation:** Regular updates via auto-updater; monitor security advisories.

### 2. Time-Based Fingerprinting
**Impact:** System timezone and clock skew can fingerprint users.
**Mitigation:** Not currently addressed; future consideration for time normalization.

### 3. Hardware Fingerprinting
**Impact:** GPU, audio, and battery APIs expose hardware characteristics.
**Mitigation:** Partial (WebRTC disabled); future work needed for comprehensive hardware API blocking.

### 4. Font Fingerprinting (Advanced)
**Impact:** Font rendering differences can fingerprint systems.
**Mitigation:** Limited font list reduces but doesn't eliminate this vector.

### 5. i2pd Binary Updates
**Impact:** i2pd uses GPG signatures, not Ed25519.
**Mitigation:** Currently checksum-only verification; production deployments should implement GPG verification or host Ed25519-signed builds.

## Privacy Properties

### What I2P Browser Protects

✅ **Browser fingerprinting** (canvas, fonts, WebRTC)
✅ **JavaScript-based tracking** (per-site blocking)
✅ **Network deanonymization** (I2P proxy integration)
✅ **Cross-session tracking** (New Identity function)
✅ **Update hijacking** (Ed25519 signatures)
✅ **Cross-site scripting** (CSP enforcement)

### What I2P Browser Does NOT Protect

❌ **Physical access** to your device
❌ **Operating system vulnerabilities**
❌ **Malware on your system**
❌ **User behavior patterns** (typing style, mouse movement)
❌ **Social engineering** attacks
❌ **Traffic timing analysis** (handled by I2P network layer)

## Hardening Checklist

When deploying I2P Browser in high-threat environments:

- [ ] Enable "Safest" security level
- [ ] Verify UPDATE_PUBLIC_KEY matches published value
- [ ] Disable JavaScript by default for all sites
- [ ] Use New Identity frequently to prevent correlation
- [ ] Verify SBOM and checksums before installation
- [ ] Run in a VM or isolated environment
- [ ] Disable network interfaces except I2P proxy
- [ ] Use full-disk encryption
- [ ] Regularly update both I2P Browser and i2pd

## Security Assumptions

This threat model assumes:

1. **I2P network is trusted** to provide anonymity
2. **Operating system is not compromised**
3. **Users follow operational security practices**
4. **Chromium sandbox is effective**
5. **Cryptographic primitives (Ed25519, SHA256) are secure**

If any of these assumptions are violated, security guarantees may be weakened.

## Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead:
1. Email security reports to: [security@your-domain.com]
2. Use PGP encryption if possible
3. Include reproduction steps and impact assessment
4. Allow 90 days for coordinated disclosure

We will acknowledge receipt within 48 hours and provide a timeline for fixes.

## References

- [Tor Browser Design](https://www.torproject.org/projects/torbrowser/design/)
- [Chromium Security Architecture](https://www.chromium.org/Home/chromium-security/)
- [I2P Network Threat Model](https://geti2p.net/en/docs/how/threat-model)
- [OWASP Fingerprinting Guide](https://owasp.org/www-community/attacks/Fingerprinting)
