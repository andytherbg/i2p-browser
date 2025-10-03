# Contributing to I2P Browser

Thank you for your interest in contributing to I2P Browser! This document provides guidelines for contributing code, reporting bugs, and suggesting features.

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and harassment-free environment for everyone.

## Ways to Contribute

### Reporting Bugs

Before creating a bug report:
- Check the [issue tracker](https://github.com/andytherbg/i2p-browser/issues) for duplicates
- Verify the bug exists in the latest release
- Test with a clean profile (New Identity)

**Good bug reports include:**
- I2P Browser version (`Help > About`)
- Operating system and version
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or error messages
- Privacy protection settings (Standard/Safer/Safest)

**Security vulnerabilities:** See [THREAT_MODEL.md](THREAT_MODEL.md) for reporting security issues privately.

### Suggesting Features

Feature requests should:
- Align with the privacy-focused mission
- Not weaken existing security properties
- Be technically feasible with Electron/Chromium
- Include use cases and user stories

Open a [feature request issue](https://github.com/andytherbg/i2p-browser/issues/new?template=feature_request.md) with:
- Clear description of the proposed feature
- Privacy/security implications
- Alternative solutions considered
- Mockups or examples (if UI changes)

### Contributing Code

We welcome pull requests for:
- Bug fixes
- New privacy features
- Performance improvements
- Documentation improvements
- Test coverage expansion

**Before starting work:**
1. Open an issue to discuss the change
2. Wait for maintainer approval
3. Fork the repository
4. Create a feature branch

## Development Setup

### Prerequisites

```bash
# Install Node.js 20.x
nvm install 20
nvm use 20

# Clone the repository
git clone https://github.com/andytherbg/i2p-browser.git
cd i2p-browser

# Install dependencies
npm ci

# Run tests
npm test
```

### Development Workflow

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm run test:all

# Run E2E tests
npm run test:e2e

# Lint code (if configured)
npm run lint
```

### Project Structure

```
i2p-browser/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script (IPC bridge)
│   ├── config.ts            # Configuration management
│   ├── permissions.ts       # Permission storage
│   ├── auto-updater.ts      # Update system
│   ├── i2p-proxy.ts         # Proxy configuration
│   └── index.html           # Browser UI
├── tests/
│   ├── e2e/                 # Playwright E2E tests
│   └── unit/                # Jest unit tests
├── docs/                    # Documentation
├── scripts/                 # Build and signing scripts
└── .github/workflows/       # CI/CD pipelines
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows existing style conventions
- [ ] Tests pass: `npm run test:all`
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Documentation updated (if applicable)
- [ ] No security regressions introduced
- [ ] Commit messages follow convention (see below)

### PR Description Template

```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- List of specific changes
- Affected files/components

## Testing
How was this tested?

## Security Impact
Does this affect privacy/security properties?

## Screenshots (if UI changes)
Before/after comparisons

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Security review completed
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `security`: Security improvement
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `docs`: Documentation changes
- `build`: Build system changes
- `ci`: CI configuration changes

**Examples:**
```
feat(privacy): add WebGL fingerprinting protection

Blocks WebGL context creation by default and prompts user
for permission when requested by websites.

Closes #123
```

```
fix(updater): correct signature URL construction for GitHub releases

Use tag name instead of version number to construct asset URLs.

Fixes #456
```

## Code Style

### TypeScript

- Use strict TypeScript with `strict: true`
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Avoid `any` types; use proper type definitions
- Document public APIs with JSDoc comments

### Example

```typescript
/**
 * Verifies an Ed25519 signature for a downloaded update.
 * @param filePath Path to the update file
 * @param signaturePath Path to the signature file
 * @returns Promise resolving to true if signature is valid
 */
async function verifySignature(
  filePath: string,
  signaturePath: string
): Promise<boolean> {
  const fileData = fs.readFileSync(filePath);
  const signature = fs.readFileSync(signaturePath, 'utf8');
  const signatureBytes = Buffer.from(signature.trim(), 'base64');
  
  return nacl.sign.detached.verify(
    fileData,
    signatureBytes,
    publicKey
  );
}
```

### File Organization

- One class/component per file
- Group related functions together
- Export public APIs explicitly
- Keep files under 500 lines when possible

## Testing

### Unit Tests (Jest)

```typescript
describe('PermissionsManager', () => {
  it('should store and retrieve permissions', () => {
    const manager = new PermissionsManager();
    manager.setPermission('example.i2p', 'javascript', false);
    
    const perms = manager.getPermissions('example.i2p');
    expect(perms.javascript).toBe(false);
  });
});
```

### E2E Tests (Playwright)

```typescript
test('should block canvas fingerprinting', async ({ page }) => {
  await page.goto('http://test.i2p/fingerprint.html');
  
  const canvasBlocked = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.toDataURL();
      return false;
    } catch (e) {
      return e.message.includes('Canvas read blocked');
    }
  });
  
  expect(canvasBlocked).toBe(true);
});
```

### Test Coverage

Aim for:
- **80%+ code coverage** for new features
- **100% coverage** for security-critical code
- E2E tests for all privacy protections

## Security Considerations

When contributing, consider:

1. **Privacy First**: Never weaken existing protections
2. **Defense in Depth**: Layer multiple protections
3. **Fail Secure**: Errors should block, not allow
4. **User Control**: Provide granular permission controls
5. **Minimal Data**: Collect and store only what's necessary

### Security Review Checklist

- [ ] No PII (personally identifiable information) logged
- [ ] No secrets hardcoded in source
- [ ] Input validation on all IPC handlers
- [ ] Origin checks on all privileged operations
- [ ] CSP policies maintained or strengthened
- [ ] Sandbox boundaries not violated
- [ ] Update signature verification not bypassed

## Documentation

Update documentation when:
- Adding new features
- Changing security behavior
- Modifying build process
- Updating dependencies

Documentation files:
- `README.md`: Project overview
- `docs/BUILD.md`: Build instructions
- `docs/THREAT_MODEL.md`: Security design
- `docs/CONTRIBUTING.md`: This file
- Code comments: Complex logic

## Release Process

Releases are managed by maintainers:

1. Version bump in `package.json`
2. Update changelog
3. Create Git tag: `git tag v1.2.3`
4. Push tag: `git push origin v1.2.3`
5. GitHub Actions builds and signs
6. Maintainers publish release notes

Contributors should not create releases.

## Communication

### GitHub Issues
For bugs, features, and general discussion.

### Pull Requests
For code contributions and reviews.

### Security Issues
Email security@your-domain.com (private disclosure).

## Recognition

Contributors will be acknowledged in:
- Release notes
- `CONTRIBUTORS.md` file
- Git commit history

Thank you for helping make I2P Browser more private and secure!

## Questions?

If you have questions not covered here:
1. Check existing [documentation](../README.md)
2. Search [closed issues](https://github.com/your-org/i2p-browser/issues?q=is%3Aissue+is%3Aclosed)
3. Ask in a new [discussion](https://github.com/your-org/i2p-browser/discussions)

We appreciate your contributions! 🎉
