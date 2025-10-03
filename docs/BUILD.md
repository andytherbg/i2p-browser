# Build Instructions

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Git

## Quick Build

```bash
# Clone the repository
git clone https://github.com/andytherbg/i2p-browser.git
cd i2p-browser

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Build for your platform
npm run dist
```

## Platform-Specific Builds

### Windows

```bash
npm run dist:win
```

Produces: `release/I2P Browser Setup <version>.exe`

### macOS

```bash
npm run dist:mac
```

Produces: `release/I2P Browser-<version>.dmg`

**Note:** macOS builds require running on macOS or using a macOS runner in CI.

### Linux

```bash
npm run dist:linux
```

Produces:
- `release/I2P Browser-<version>.AppImage`
- `release/i2p-browser_<version>_amd64.deb`

## Deterministic Builds with Docker

For reproducible builds, use the official Node.js Docker image on Linux:

### Build Container Setup

```dockerfile
FROM node:20-bullseye

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
```

### Deterministic Build Process

```bash
# Build the Docker image
docker build -t i2p-browser-builder .

# Run deterministic build
docker run --rm \
  -v $(pwd):/build \
  -e SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
  i2p-browser-builder \
  bash -c "npm ci --ignore-scripts && npm run build && npm run dist:linux"
```

### Build Environment Variables

For reproducible builds, set these environment variables:

```bash
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)
export NODE_ENV=production
export npm_config_cache=/tmp/npm-cache
```

### Dockerfile for Deterministic Builds

Create `Dockerfile.build`:

```dockerfile
FROM node:20-bullseye

# Set fixed timezone for determinism
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgbm1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for builds
RUN useradd -m -u 1000 builder

WORKDIR /build
USER builder

# Copy package files
COPY --chown=builder:builder package*.json ./

# Install dependencies with locked versions
RUN npm ci --ignore-scripts

# Copy source code
COPY --chown=builder:builder . .

# Build
ARG SOURCE_DATE_EPOCH
RUN npm run build && npm run dist:linux

# Output artifacts
CMD ["cp", "-r", "release", "/output/"]
```

### Running Deterministic Build

```bash
# Build the Docker image
docker build -f Dockerfile.build -t i2p-browser-builder:latest .

# Run the build
docker run --rm \
  -v $(pwd)/output:/output \
  -e SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
  i2p-browser-builder:latest

# Artifacts will be in ./output/release/
```

### Verifying Build Reproducibility

```bash
# Build twice with same commit
docker run --rm -v $(pwd)/output1:/output i2p-browser-builder:latest
docker run --rm -v $(pwd)/output2:/output i2p-browser-builder:latest

# Compare checksums
sha256sum output1/release/*.AppImage
sha256sum output2/release/*.AppImage

# They should match exactly
diff <(sha256sum output1/release/*.AppImage) \
     <(sha256sum output2/release/*.AppImage)
```

## Development Build

For faster development iterations:

```bash
# Watch mode compilation
npm run build -- --watch

# Run in development mode
npm run dev
```

## Release Build with Signatures

Generate Ed25519 keys (first time only):

```bash
npm run generate-keys
```

Build and sign:

```bash
# Build for all platforms (requires CI or cross-compilation)
npm run dist

# Sign the releases
export SECRET_KEY_PATH=./keys/secret.key
npm run sign-release
```

This creates:
- Binary installers for each platform
- `.sig` files containing Ed25519 signatures
- `manifest.json` with SHA256 checksums
- `manifest.json.sig` for manifest verification

## Build Artifacts

After building, the `release/` directory contains:

### Windows
- `I2P Browser Setup <version>.exe` - NSIS installer
- `I2P Browser Setup <version>.exe.sig` - Ed25519 signature

### macOS
- `I2P Browser-<version>.dmg` - Disk image
- `I2P Browser-<version>.dmg.sig` - Ed25519 signature

### Linux
- `I2P Browser-<version>.AppImage` - Portable application
- `i2p-browser_<version>_amd64.deb` - Debian package
- Corresponding `.sig` files

### Metadata
- `manifest.json` - Build manifest with checksums
- `manifest.json.sig` - Manifest signature
- `sbom.json` - Software Bill of Materials (CycloneDX format)

## Troubleshooting

### Linux Build Issues

**Error: `libgbm.so.1` not found**
```bash
sudo apt-get install libgbm1
```

### macOS Signing Issues

For local macOS builds, you may need to disable code signing:

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist:mac
```

### Windows Build on Linux

Cross-compilation for Windows requires wine:

```bash
sudo apt-get install wine64
npm run dist:win
```

## Clean Build

To ensure a clean build environment:

```bash
# Remove all build artifacts
rm -rf dist/ release/ node_modules/

# Reinstall dependencies
npm ci

# Build from scratch
npm run build && npm run dist
```

## CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Builds for Windows, macOS, and Linux
2. Generates SBOM (Software Bill of Materials)
3. Creates SHA256 checksums
4. Signs all artifacts with Ed25519
5. Publishes to GitHub Releases

See `.github/workflows/build-and-sign.yml` for details.
