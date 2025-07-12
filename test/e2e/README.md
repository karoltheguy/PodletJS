# E2E Testing Guide

This directory contains end-to-end (E2E) tests for the PodletJS project. These tests verify the complete functionality of the library from input to output, testing real-world scenarios and workflows.

## Test Structure

The E2E tests are organized into several test files:

### `podlet-js.e2e.test.js`
Tests the main PodletJS class functionality:
- Docker run command parsing
- Docker Compose file parsing
- File generation and writing
- Advanced Quadlet options
- Error handling
- Real-world scenarios (WordPress + MySQL, Monitoring stack)

### `quadlet-generator.e2e.test.js`
Tests complete Quadlet file generation:
- Production-ready web server configurations
- Database containers with security settings
- Microservices with comprehensive networking
- Multi-container stack generation
- Validation and best practices
- Special character handling and escaping

### `container.e2e.test.js`
Tests Container class workflows:
- Step-by-step container configuration
- Database container setup with persistence
- Microservice configuration with networking
- Container state persistence and serialization
- Container validation and error handling
- Container cloning and copying

## Running E2E Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npm test -- test/e2e/podlet-js.e2e.test.js
npm test -- test/e2e/quadlet-generator.e2e.test.js
npm test -- test/e2e/container.e2e.test.js
```

### Run with watch mode:
```bash
npm run test:watch -- test/e2e
```

### Run with coverage:
```bash
npm run test:coverage -- test/e2e
```

## Test Scenarios

### Real-world Application Stacks

#### LAMP Stack
Tests generation of a complete LAMP (Linux, Apache, MySQL, PHP) stack with:
- Apache/PHP web server
- MySQL database with persistence
- PHPMyAdmin for database management
- Proper networking between services

#### WordPress + MySQL
Tests a production WordPress deployment with:
- WordPress container with proper environment variables
- MySQL database with secure configuration
- Named volumes for data persistence
- Custom network configuration

#### Monitoring Stack
Tests Prometheus and Grafana monitoring setup with:
- Prometheus with custom configuration
- Grafana with admin credentials
- Persistent data volumes
- Monitoring network

### Container Configuration Patterns

#### Web Application
- Node.js/Python applications
- Port publishing and networking
- Volume mounts for code and data
- Environment variable configuration
- Health checks and monitoring
- Security hardening

#### Database Services
- PostgreSQL/MySQL/Redis configurations
- Data persistence with named volumes
- Security settings (user, capabilities, no-new-privileges)
- Resource limits and system configuration
- Health checks and startup procedures

#### Microservices
- API services with multiple networks
- Service discovery and networking
- Logging and monitoring integration
- Secret management
- Auto-update and pull policies

### Security Testing

The E2E tests include comprehensive security configuration testing:

- **User and Group Management**: Testing user/group settings, group additions
- **Capabilities**: Adding and dropping Linux capabilities
- **Security Labels**: SELinux/AppArmor security contexts
- **Read-only Filesystems**: Testing read-only containers with tmpfs
- **No New Privileges**: Security hardening options
- **Resource Limits**: PID limits, ulimits, sysctls

### Networking Testing

Network configuration testing covers:

- **Multiple Networks**: Connecting containers to multiple networks
- **Network Aliases**: Service discovery within networks
- **Port Publishing**: Host to container port mapping
- **DNS Configuration**: Custom DNS servers and search domains
- **IP Assignment**: Static IP assignment for containers

### Storage Testing

Storage and volume testing includes:

- **Named Volumes**: Persistent data storage
- **Bind Mounts**: Host directory mounting
- **Tmpfs Mounts**: In-memory filesystems
- **Volume Options**: SELinux labels, read-only mounts

## File Generation Testing

The E2E tests verify that generated Quadlet files:

1. **Follow systemd conventions**: Proper section ordering and formatting
2. **Are syntactically valid**: No malformed configuration entries
3. **Handle escaping correctly**: Proper quoting of values with spaces/special characters
4. **Include all required sections**: Unit, Container, Service, Install sections when needed
5. **Use appropriate defaults**: Sensible default values for optional settings

## Test Data and Fixtures

E2E tests use temporary directories and files to:

- Create and clean up test files automatically
- Test file I/O operations
- Verify generated file content
- Test Docker Compose file parsing

All temporary files are cleaned up automatically after each test using the `tmp` library.

## Error Handling and Validation

The E2E tests verify proper error handling for:

- Invalid Docker run commands
- Malformed Docker Compose files
- Non-existent files
- Invalid container configurations
- Network and port validation
- Environment variable validation

## Dependencies

The E2E tests require the following additional dependencies:

- `fs-extra`: Enhanced file system operations
- `tmp`: Temporary file and directory creation
- `@jest/globals`: Jest testing utilities

These are automatically installed as dev dependencies when you run `npm install`.

## VS Code Integration

With the Jest extension installed, you can:

- Run individual tests from the VS Code interface
- Set breakpoints in test files
- View test results in the Test Explorer
- Get inline test status indicators

## Continuous Integration

The E2E tests are designed to run in CI environments and include:

- Proper cleanup of temporary files
- No external dependencies (containers, services)
- Deterministic test behavior
- Comprehensive error reporting

## Adding New E2E Tests

When adding new E2E tests:

1. Follow the existing file naming convention: `*.e2e.test.js`
2. Use descriptive test names that explain the scenario
3. Include setup and cleanup in `beforeEach`/`afterEach`
4. Test both success and failure scenarios
5. Verify generated file content thoroughly
6. Use temporary directories for file operations
7. Include validation of error conditions
