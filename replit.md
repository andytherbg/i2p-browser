# I2P Browser

## Overview

I2P Browser is a privacy-focused desktop browser application built with Electron and TypeScript. It provides configurable security levels and proxy support specifically designed for I2P network browsing. The application allows users to customize Chromium flags, configure proxy settings, and enforce Content Security Policies to enhance privacy and security.

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

**Security Levels:**
- Standard: Default browser behavior
- Safer: Enhanced privacy protections
- Safest: Maximum security (may break some sites)

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
- Menu system (not fully shown in provided code)

**Preload Script** (`preload.ts`):
- Controlled bridge between main and renderer processes
- Exposes minimal API surface (`i2pBrowser.version`)
- Maintains security through context isolation

**Renderer Process** (`index.html`):
- User interface and browser chrome
- Communicates with main process via exposed APIs

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