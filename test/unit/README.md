# Unit Tests

This directory contains comprehensive unit tests for the PodletJS project.

## Test Files

### `quadlet-generator.test.js`
Comprehensive unit tests for the `QuadletGenerator` class covering:

- **File Generation** (`generateFile`):
  - Basic quadlet file generation
  - Unit, Service, Install, and GlobalArgs sections
  - Complete file generation with all sections

- **Container Section Generation** (`generateContainerSection`):
  - Basic container configuration (image, name, exec)
  - Networking (ports, networks, aliases, DNS)
  - Environment variables and files
  - Security options (capabilities, masks, SELinux labels)
  - User and group settings
  - Runtime options (read-only, init, working directory)
  - Health checks (regular and startup)
  - Systemd integration (notify, signals, timeouts)
  - Logging configuration
  - Resource limits and annotations
  - Advanced features (secrets, rootfs, IP addresses)

- **Section Generators**:
  - `generateUnitSection` - systemd unit configuration
  - `generateServiceSection` - systemd service configuration  
  - `generateInstallSection` - systemd install configuration
  - `escapeValue` - value escaping for special characters

- **Integration Tests**:
  - Realistic web server container
  - Database container with security options

### `container.test.js`
Tests for the `Container` class covering basic configuration and validation.

### `compose-parser.test.js`
Tests for the `ComposeParser` class covering Docker Compose YAML parsing.

### `index.test.js`
Tests for the main `PodletJS` class covering the public API.

## Test Coverage

The tests achieve high coverage:
- **Lines**: 81.83%
- **Branches**: 84.84% 
- **Functions**: 68.42%
- **Statements**: 81.94%

The `QuadletGenerator` achieves 100% line and statement coverage with 99.38% branch coverage.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/unit/quadlet-generator.test.js

# Run with coverage
npm test -- --coverage
```
