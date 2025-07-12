import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Container } from '../../src/container.js';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

describe('Container E2E Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  describe('Container Configuration Workflows', () => {
    it('should build a complete web application container step by step', () => {
      const container = new Container();
      
      // Step 1: Basic container setup
      container.setImage('node:18-alpine');
      container.setContainerName('my-web-app');
      expect(container.image).toBe('node:18-alpine');
      expect(container.containerName).toBe('my-web-app');
      
      // Step 2: Add networking
      container.addPublishPort('3000:3000');
      container.addPublishPort('3001:3001');
      expect(container.publishPort).toHaveLength(2);
      expect(container.publishPort).toContain('3000:3000');
      expect(container.publishPort).toContain('3001:3001');
      
      // Step 3: Add volumes
      container.addVolume('./app:/usr/src/app:ro');
      container.addVolume('node_modules:/usr/src/app/node_modules');
      container.addVolume('/tmp:/tmp:rw');
      expect(container.volume).toHaveLength(3);
      expect(container.volume[0]).toBe('./app:/usr/src/app:ro');
      
      // Step 4: Configure environment
      container.addEnvironment('NODE_ENV=production');
      container.addEnvironment('PORT=3000');
      container.addEnvironment('DEBUG=app:*');
      expect(container.environment).toHaveLength(3);
      
      // Step 5: Add labels for metadata
      container.addLabel('service=web');
      container.addLabel('version=1.0.0');
      container.addLabel('maintainer=team@example.com');
      expect(container.label).toHaveLength(3);
      
      // Step 6: Configure security
      container.user = 'node:node';
      container.noNewPrivileges = true;
      container.dropCapability.push('ALL');
      container.addCapability.push('CHOWN');
      container.readOnly = true;
      
      // Step 7: Add health checks
      container.healthCmd = 'curl -f http://localhost:3000/health';
      container.healthInterval = '30s';
      container.healthTimeout = '5s';
      container.healthRetries = 3;
      
      // Step 8: Configure runtime options
      container.workingDir = '/usr/src/app';
      container.setExec('npm start');
      container.stopSignal = 'SIGTERM';
      container.stopTimeout = 30;
      
      // Verify final configuration
      expect(container.user).toBe('node:node');
      expect(container.noNewPrivileges).toBe(true);
      expect(container.readOnly).toBe(true);
      expect(container.healthCmd).toBe('curl -f http://localhost:3000/health');
      expect(container.workingDir).toBe('/usr/src/app');
      expect(container.exec).toBe('npm start');
    });

    it('should configure a database container with proper persistence and security', () => {
      const container = new Container();
      
      // Database setup
      container.setImage('postgres:15-alpine');
      container.setContainerName('production-database');
      
      // Port configuration
      container.addPublishPort('5432:5432');
      
      // Volume configuration for persistence
      container.addVolume('postgres_data:/var/lib/postgresql/data:Z');
      container.addVolume('./postgres-init:/docker-entrypoint-initdb.d:ro');
      container.addVolume('./postgres-config:/etc/postgresql:ro');
      
      // Environment variables
      container.addEnvironment('POSTGRES_DB=myapp');
      container.addEnvironment('POSTGRES_USER=appuser');
      container.addEnvironment('POSTGRES_PASSWORD=secretpassword');
      container.addEnvironment('PGDATA=/var/lib/postgresql/data/pgdata');
      
      // Security configuration
      container.user = 'postgres:postgres';
      container.noNewPrivileges = true;
      container.dropCapability = ['ALL'];
      container.addCapability.push('SETGID');
      container.addCapability.push('SETUID');
      container.addCapability.push('DAC_READ_SEARCH');
      
      // Health checks
      container.healthCmd = 'pg_isready -U appuser -d myapp';
      container.healthInterval = '10s';
      container.healthTimeout = '5s';
      container.healthRetries = 5;
      container.healthStartPeriod = '60s';
      
      // Resource limits
      container.shmSize = '256m';
      container.ulimit.push('nofile=1024:1024');
      container.ulimit.push('nproc=512:512');
      
      // System configuration
      container.sysctl.push('kernel.shmmax=134217728');
      container.sysctl.push('kernel.shmall=32768');
      
      // Labels for management
      container.addLabel('service=database');
      container.addLabel('role=primary');
      container.addLabel('backup=enabled');
      
      // Verify all configurations
      expect(container.image).toBe('postgres:15-alpine');
      expect(container.publishPort).toContain('5432:5432');
      expect(container.volume).toHaveLength(3);
      expect(container.environment).toHaveLength(4);
      expect(container.user).toBe('postgres:postgres');
      expect(container.dropCapability).toContain('ALL');
      expect(container.addCapability).toContain('SETGID');
      expect(container.healthCmd).toBe('pg_isready -U appuser -d myapp');
      expect(container.shmSize).toBe('256m');
      expect(container.ulimit).toHaveLength(2);
      expect(container.sysctl).toHaveLength(2);
    });

    it('should configure a microservice with comprehensive networking', () => {
      const container = new Container();
      
      // Basic setup
      container.setImage('python:3.11-slim');
      container.setContainerName('api-microservice');
      
      // Network configuration
      container.network.push('backend');
      container.network.push('monitoring');
      container.network.push('logging');
      container.networkAlias.push('api');
      container.networkAlias.push('python-api');
      
      // Port publishing
      container.addPublishPort('8000:8000');
      container.addPublishPort('8001:8001'); // Health/metrics port
      
      // DNS configuration
      container.dns.push('8.8.8.8');
      container.dns.push('1.1.1.1');
      container.dnsSearch.push('internal.company.com');
      container.dnsOption.push('rotate');
      container.dnsOption.push('timeout:2');
      
      // IP configuration
      container.ip = '192.168.1.100';
      container.ip6 = '2001:db8::100';
      
      // Hostname
      container.hostName = 'api-service';
      
      // Environment and secrets
      container.addEnvironment('PYTHONPATH=/app');
      container.addEnvironment('API_PORT=8000');
      container.environmentFile.push('/etc/api/config.env');
      container.secret.push('api_key');
      container.secret.push('db_password,type=mount');
      
      // Volume configuration
      container.addVolume('./api:/app:ro');
      container.addVolume('api_logs:/var/log/api');
      container.tmpfs.push('/tmp:noexec,nosuid,size=100m');
      container.tmpfs.push('/run:size=50m');
      
      // Security
      container.user = 'api:api';
      container.groupAdd.push('logging');
      container.noNewPrivileges = true;
      container.readOnly = true;
      container.mask.push('/proc/acpi');
      container.mask.push('/sys/firmware');
      container.unmask = ['ALL'];
      
      // Capabilities
      container.dropCapability.push('ALL');
      container.addCapability.push('NET_BIND_SERVICE');
      
      // Resource limits
      container.pidsLimit = 50;
      container.ulimit.push('nofile=2048:4096');
      container.sysctl.push('net.core.somaxconn=1024');
      
      // Logging
      container.logDriver = 'journald';
      container.logOpt.push('tag=api-microservice');
      container.logOpt.push('labels=service,version');
      
      // Annotations
      container.annotation.push('description=Main API microservice');
      container.annotation.push('version=2.1.0');
      container.annotation.push('team=backend');
      
      // Runtime options
      container.workingDir = '/app';
      container.setExec('python -m uvicorn main:app --host 0.0.0.0 --port 8000');
      container.runInit = true;
      container.timezone = 'UTC';
      
      // Health configuration
      container.healthCmd = 'curl -f http://localhost:8000/health';
      container.healthInterval = '15s';
      container.healthTimeout = '10s';
      container.healthRetries = 3;
      container.healthStartPeriod = '30s';
      
      // Startup health check
      container.healthStartupCmd = 'curl -f http://localhost:8000/ready';
      container.healthStartupInterval = '5s';
      container.healthStartupRetries = 6;
      container.healthStartupTimeout = '3s';
      
      // SystemD integration
      container.notify = 'healthy';
      container.stopSignal = 'SIGTERM';
      container.stopTimeout = 60;
      
      // Auto-update
      container.autoUpdate = 'registry';
      container.pull = 'newer';
      
      // Verify comprehensive configuration
      expect(container.network).toHaveLength(3);
      expect(container.networkAlias).toHaveLength(2);
      expect(container.dns).toHaveLength(2);
      expect(container.dnsOption).toHaveLength(2);
      expect(container.ip).toBe('192.168.1.100');
      expect(container.hostName).toBe('api-service');
      expect(container.secret).toHaveLength(2);
      expect(container.tmpfs).toHaveLength(2);
      expect(container.mask).toHaveLength(2);
      expect(container.annotation).toHaveLength(3);
      expect(container.notify).toBe('healthy');
      expect(container.autoUpdate).toBe('registry');
    });
  });

  describe('Container State Persistence', () => {
    it('should maintain container state through serialization', async () => {
      const container = new Container();
      
      // Configure a complex container
      container.setImage('redis:7-alpine');
      container.setContainerName('cache-server');
      container.addPublishPort('6379:6379');
      container.addVolume('redis_data:/data:Z');
      container.addEnvironment('REDIS_PASSWORD=cachepass');
      container.addEnvironment('REDIS_MAXMEMORY=256mb');
      container.addLabel('service=cache');
      container.addLabel('tier=backend');
      container.user = 'redis:redis';
      container.healthCmd = 'redis-cli ping';
      container.workingDir = '/data';
      container.readOnly = true;
      container.noNewPrivileges = true;
      
      // Serialize container state to JSON
      const containerState = {
        image: container.image,
        containerName: container.containerName,
        publishPort: container.publishPort,
        volume: container.volume,
        environment: container.environment,
        label: container.label,
        user: container.user,
        healthCmd: container.healthCmd,
        workingDir: container.workingDir,
        readOnly: container.readOnly,
        noNewPrivileges: container.noNewPrivileges
      };
      
      const stateFile = path.join(tempDir.name, 'container-state.json');
      await fs.writeJson(stateFile, containerState, { spaces: 2 });
      
      // Read and restore container state
      const restoredState = await fs.readJson(stateFile);
      const restoredContainer = new Container();
      
      restoredContainer.setImage(restoredState.image);
      restoredContainer.setContainerName(restoredState.containerName);
      restoredState.publishPort.forEach(port => restoredContainer.addPublishPort(port));
      restoredState.volume.forEach(vol => restoredContainer.addVolume(vol));
      restoredState.environment.forEach(env => restoredContainer.addEnvironment(env));
      restoredState.label.forEach(lbl => restoredContainer.addLabel(lbl));
      restoredContainer.user = restoredState.user;
      restoredContainer.healthCmd = restoredState.healthCmd;
      restoredContainer.workingDir = restoredState.workingDir;
      restoredContainer.readOnly = restoredState.readOnly;
      restoredContainer.noNewPrivileges = restoredState.noNewPrivileges;
      
      // Verify restored container matches original
      expect(restoredContainer.image).toBe(container.image);
      expect(restoredContainer.containerName).toBe(container.containerName);
      expect(restoredContainer.publishPort).toEqual(container.publishPort);
      expect(restoredContainer.volume).toEqual(container.volume);
      expect(restoredContainer.environment).toEqual(container.environment);
      expect(restoredContainer.label).toEqual(container.label);
      expect(restoredContainer.user).toBe(container.user);
      expect(restoredContainer.healthCmd).toBe(container.healthCmd);
      expect(restoredContainer.workingDir).toBe(container.workingDir);
      expect(restoredContainer.readOnly).toBe(container.readOnly);
      expect(restoredContainer.noNewPrivileges).toBe(container.noNewPrivileges);
    });
  });

  describe('Container Validation and Error Handling', () => {
    it('should handle invalid configurations gracefully', () => {
      const container = new Container();
      
      // Test setting empty image
      expect(() => container.setImage('')).toThrow();
      expect(() => container.setImage(null)).toThrow();
      expect(() => container.setImage(undefined)).toThrow();
      
      // Test setting invalid container name
      expect(() => container.setContainerName('')).toThrow();
      expect(() => container.setContainerName('Invalid Name')).toThrow();
      expect(() => container.setContainerName('invalid@name')).toThrow();
      
      // Test adding invalid ports
      expect(() => container.addPublishPort('')).toThrow();
      expect(() => container.addPublishPort('invalid')).toThrow();
      expect(() => container.addPublishPort('99999:80')).toThrow();
      
      // Test adding invalid volumes
      expect(() => container.addVolume('')).toThrow();
      expect(() => container.addVolume('invalid')).toThrow();
      
      // Test adding invalid environment variables
      expect(() => container.addEnvironment('')).toThrow();
      expect(() => container.addEnvironment('INVALID')).toThrow();
      
      // Test adding invalid labels
      expect(() => container.addLabel('')).toThrow();
      expect(() => container.addLabel('invalid')).toThrow();
    });

    it('should validate container configuration before generation', () => {
      const container = new Container();
      
      // Container without image should be invalid
      expect(() => container.validate()).toThrow('Image is required');
      
      // Container with image should be valid
      container.setImage('nginx:alpine');
      expect(() => container.validate()).not.toThrow();
      
      // Container with invalid port should be invalid
      container.publishPort.push('invalid:port');
      expect(() => container.validate()).toThrow();
      
      // Reset and test with valid configuration
      container.publishPort = [];
      container.addPublishPort('80:80');
      expect(() => container.validate()).not.toThrow();
    });
  });

  describe('Container Cloning and Copying', () => {
    it('should create deep copies of containers', () => {
      const originalContainer = new Container();
      originalContainer.setImage('nginx:alpine');
      originalContainer.setContainerName('original-web');
      originalContainer.addPublishPort('80:80');
      originalContainer.addVolume('./html:/usr/share/nginx/html:ro');
      originalContainer.addEnvironment('NGINX_HOST=example.com');
      originalContainer.addLabel('service=web');
      originalContainer.user = 'nginx:nginx';
      originalContainer.readOnly = true;
      
      // Clone the container
      const clonedContainer = originalContainer.clone();
      
      // Modify the clone
      clonedContainer.setContainerName('cloned-web');
      clonedContainer.addPublishPort('8080:80');
      clonedContainer.addEnvironment('NGINX_HOST=test.example.com');
      
      // Verify original is unchanged
      expect(originalContainer.containerName).toBe('original-web');
      expect(originalContainer.publishPort).toHaveLength(1);
      expect(originalContainer.publishPort[0]).toBe('80:80');
      expect(originalContainer.environment).toHaveLength(1);
      expect(originalContainer.environment[0]).toBe('NGINX_HOST=example.com');
      
      // Verify clone has modifications
      expect(clonedContainer.containerName).toBe('cloned-web');
      expect(clonedContainer.publishPort).toHaveLength(2);
      expect(clonedContainer.publishPort).toContain('80:80');
      expect(clonedContainer.publishPort).toContain('8080:80');
      expect(clonedContainer.environment).toHaveLength(2);
      expect(clonedContainer.environment).toContain('NGINX_HOST=example.com');
      expect(clonedContainer.environment).toContain('NGINX_HOST=test.example.com');
      
      // Verify shared properties are still equal
      expect(clonedContainer.image).toBe(originalContainer.image);
      expect(clonedContainer.volume).toEqual(originalContainer.volume);
      expect(clonedContainer.label).toEqual(originalContainer.label);
      expect(clonedContainer.user).toBe(originalContainer.user);
      expect(clonedContainer.readOnly).toBe(originalContainer.readOnly);
    });
  });
});
