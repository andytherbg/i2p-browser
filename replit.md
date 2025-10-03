# I2P Browser

## Overview

I2P Browser is a privacy-focused desktop browser application built with Electron and TypeScript. It provides configurable security levels and proxy support specifically designed for I2P network browsing. The application features advanced anti-fingerprinting protections including per-site JavaScript control, canvas fingerprinting protection, font access control, and WebRTC blocking. Users can customize Chromium flags, configure proxy settings, and enforce Content Security Policies to enhance privacy and security.

## Recent Changes (October 2025)

### Advanced Privacy Features
- **Per-Site JavaScript Toggle**: NoScript-lite functionality with CSP-based blocking (script-src 'none') for complete inline/eval/network script prevention
- **Canvas Fingerprinting Protection**: Intercepts canvas read operations (toDataURL, getImageData) with user consent dialogs, injected before page scripts via webFrame.executeJavaScript
- **Font Access Control**: Restricts font enumeration to minimal list (Arial, Times New Roman, Courier New, Verdana) with permission prompts
- **New Identity Function**: One-click clearing of all permissions, cookies, cache, and session data (Ctrl+Shift+N)
- **I2P Portal Menu**: Quick access menu for common I2P sites (Postman HQ, Stats, IRC, Forum)

### Auto-Update System
- **Electron AutoUpdater**: GitHub Releases integration with automatic update checking on app start
- **Ed25519 Signature Verification**: All app updates verified with tweetnacl before installation using embedded public key
- **Non-Intrusive UI**: Bottom-right notification panel with download progress and install controls
- **i2pd Binary Updates**: Separate update mechanism for i2pd daemon with checksum verification
- **Signing Infrastructure**: Scripts for Ed25519 key generation, release signing (SHA256 + signature), and automated CI workflow
- **Multi-Platform Builds**: GitHub Actions workflow builds and signs for Windows (NSIS), macOS (DMG), and Linux (AppImage/deb)

### Testing Infrastructure
- **E2E Tests**: Playwright-based end-to-end tests verifying WebRTC unavailability, canvas blocking, and minimal font list
- **Test Page**: Comprehensive test page validating all privacy protections at runtime
- **Test Commands**: `npm run test:e2e` for automated tests, `npm run test:all` for full test suite

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Desktop Application Framework

**Problem:** Need a cross-platform desktop browser with deep control over browser behavior and security settings.

**Solution:** Electron framework with TypeScript for type safety and maintainability.

**Rationale:** Electron provides full access to Chromium's underlying features while enabling cross-platform deployment (Windows, macOS, Linux). TypeScript adds compile-time type checking to catch errors early.

**Pros:**
- Cross-platform compatibility with single codebase
- Direct access to Chromium command-line flags
- Native system integration capabilities
- Strong typing with TypeScript

**Cons:**
- Larger application bundle size
- Higher memory footprint than native applications

### Configuration Management

**Problem:** Users need persistent storage of security preferences and proxy settings.

**Solution:** File-based JSON configuration stored in the user's application data directory.

**Implementation:** `ConfigManager` class handles reading/writing preferences to `preferences.json` in the Electron `userData` path.

**Data Structure:**
- `securityLevel`: Three-tier security model ('Standard', 'Safer', 'Safest')
- `chromiumFlags`: Array of command-line switches for Chromium engine
- `proxySettings`: Configurable proxy support (HTTP/SOCKS5)

**Pros:**
- Simple, human-readable format
- Easy to backup and transfer
- No database dependencies

**Cons:**
- No built-in encryption for sensitive data
- Concurrent write access not handled

### Security Architecture

**Problem:** Need granular control over browser security and privacy features.

**Solution:** Multi-layered security approach:

1. **Chromium Flag Injection**: Dynamic command-line flags applied at startup
2. **Proxy Configuration**: Support for I2P HTTP proxy (default 127.0.0.1:4444) and SOCKS5
3. **Content Security Policy**: Runtime CSP header injection via webRequest API
4. **Renderer Process Isolation**: Electron's context isolation with controlled API exposure
5. **Script Injection Protection**: Runtime JavaScript injection to intercept fingerprinting APIs
6. **Permission System**: Per-site permissions stored persistently for JavaScript, canvas, and font access

**Security Levels:**
- Standard: Default browser behavior
- Safer: Enhanced privacy protections
- Safest: Maximum security (may break some sites)

**Anti-Fingerprinting Protections:**
- WebRTC completely disabled (prevents IP leaks)
- Canvas read operations require user consent
- Font enumeration limited to 4 safe fonts
- User agent normalized to Firefox 102
- Viewport bucketed to common resolutions
- Per-site JavaScript control

### Build System

**Problem:** Need automated builds for multiple platforms.

**Solution:** electron-builder for cross-platform packaging.

**Targets:**
- Windows: NSIS installer
- macOS: DMG image
- Linux: AppImage

**Build Process:**
1. TypeScript compilation (`tsc`) to `dist/` directory
2. electron-builder packages compiled code with Electron runtime
3. Platform-specific installers generated in `release/` directory

### Application Architecture

**Main Process** (`main.ts`):
- Window lifecycle management
- Configuration loading and application
- Proxy and security policy setup
- IPC handlers for permission requests
- Menu system with security controls
- Script injection for privacy protection

**Preload Script** (`preload.ts`):
- Controlled bridge between main and renderer processes
- Exposes privacy APIs: canvas/font permissions, JavaScript toggle, New Identity, I2P portals
- Maintains security through context isolation

**Renderer Process** (`index.html`):
- User interface and browser chrome
- Communicates with main process via exposed APIs

**Privacy Protection Scripts** (`privacy-protection.ts`):
- Canvas API interception (toDataURL, getImageData)
- Font API spoofing (document.fonts.check, getComputedStyle)
- Permission state management in renderer context

**Permissions Manager** (`permissions.ts`):
- Per-domain permission storage (JavaScript, canvas, fonts)
- Persistent JSON-based configuration
- Toggle and query APIs for site-specific settings

## External Dependencies

### Core Framework
- **Electron** (v38.2.0): Desktop application framework providing Chromium browser engine and Node.js runtime

### Build Tools
- **TypeScript** (v5.9.3): Type-safe JavaScript compiler
- **electron-builder** (v26.0.12): Multi-platform build and packaging tool

### Runtime Dependencies
- **Node.js APIs**: File system operations, path manipulation
- **Chromium APIs**: Command-line switches, proxy configuration, session management, CSP enforcement

### Expected External Services
- **I2P Network Proxy**: Default configuration expects HTTP proxy at 127.0.0.1:4444 (standard I2P HTTP proxy endpoint)
- Alternative SOCKS5 proxy support available

### Operating System Integration
- Uses Electron's `userData` path for configuration storage (platform-specific locations)
- Requires system permissions for network proxy configuration