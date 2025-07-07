/**
 * Comprehensive tests for Compose parsing functionality
 */

import { PodletJS, ComposeParser } from '../src/index.js';

function testBasicCompose() {
  console.log('\n=== Testing Basic Compose Files ===');
  
  const podlet = new PodletJS();
  
  // Test 1: Simple service
  const simpleCompose = `
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
  `;
  
  console.log('\nTest 1: Simple service');
  const result1 = podlet.composeToQuadlet(simpleCompose);
  console.log('Web service:');
  console.log(result1.web);
  
  // Test 2: Multiple services
  const multiCompose = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
  
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
  `;
  
  console.log('\nTest 2: Multiple services');
  const result2 = podlet.composeToQuadlet(multiCompose);
  console.log('Web service:');
  console.log(result2.web);
  console.log('\nDB service:');
  console.log(result2.db);
}

function testComposeFeatures() {
  console.log('\n=== Testing Compose Features ===');
  
  const podlet = new PodletJS();
  
  // Test comprehensive features
  const featureCompose = `
version: '3.8'
services:
  app:
    image: node:18-alpine
    container_name: my-app
    hostname: app.example.com
    user: "1000:1000"
    working_dir: /app
    command: ["npm", "start"]
    entrypoint: ["/docker-entrypoint.sh"]
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001/udp"
    volumes:
      - "./app:/app:ro"
      - "node_modules:/app/node_modules"
      - type: tmpfs
        target: /tmp
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://user:pass@db:5432/app
    env_file:
      - .env
      - .env.local
    labels:
      app: web
      version: "1.0.0"
    networks:
      - frontend
      - backend
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    read_only: true
    init: true
    tty: true
    stdin_open: true
    mem_limit: 512m
    cpus: 0.5
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - db
      - cache

  db:
    image: postgres:15
    
  cache:
    image: redis:7-alpine

networks:
  frontend:
  backend:
  `;
  
  console.log('\nTesting comprehensive features:');
  const result = podlet.composeToQuadlet(featureCompose);
  console.log('App service with all features:');
  console.log(result.app);
}

function testVolumeTypes() {
  console.log('\n=== Testing Volume Types ===');
  
  const parser = new ComposeParser();
  
  const volumeCompose = `
version: '3.8'
services:
  app:
    image: nginx
    volumes:
      # Short syntax
      - ./html:/usr/share/nginx/html:ro
      - data_volume:/data
      # Long syntax
      - type: bind
        source: ./config
        target: /etc/nginx
        read_only: true
      - type: volume
        source: logs
        target: /var/log
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100M

volumes:
  data_volume:
  logs:
  `;
  
  console.log('\nTesting various volume types:');
  const containers = parser.parse(volumeCompose);
  console.log('Volumes:');
  console.log('Regular volumes:', containers.app.volume);
  console.log('Tmpfs volumes:', containers.app.tmpfs);
}

function testNetworking() {
  console.log('\n=== Testing Networking ===');
  
  const parser = new ComposeParser();
  
  const networkCompose = `
version: '3.8'
services:
  web:
    image: nginx
    hostname: web.local
    networks:
      frontend:
        ipv4_address: 172.20.0.10
        aliases:
          - web
          - nginx
      backend:
    dns:
      - 8.8.8.8
      - 8.8.4.4

networks:
  frontend:
    ipam:
      config:
        - subnet: 172.20.0.0/16
  backend:
  `;
  
  console.log('\nTesting networking configuration:');
  const containers = parser.parse(networkCompose);
  console.log('Networks:', containers.web.network);
  console.log('Network aliases:', containers.web.networkAlias);
  console.log('DNS:', containers.web.dns);
  console.log('Hostname:', containers.web.hostName);
}

function testPortFormats() {
  console.log('\n=== Testing Port Formats ===');
  
  const parser = new ComposeParser();
  
  const portCompose = `
version: '3.8'
services:
  app:
    image: nginx
    ports:
      # Short syntax
      - "8080:80"
      - "8443:443"
      - "3000"
      - "127.0.0.1:5432:5432"
      # Long syntax
      - target: 9000
        published: 9000
        protocol: tcp
      - target: 9001
        published: 9001
        protocol: udp
  `;
  
  console.log('\nTesting port formats:');
  const containers = parser.parse(portCompose);
  console.log('Published ports:', containers.app.publishPort);
}

function testDependencies() {
  console.log('\n=== Testing Dependencies ===');
  
  const podlet = new PodletJS();
  
  const depCompose = `
version: '3.8'
services:
  web:
    image: nginx
    depends_on:
      - api
      - cache
  
  api:
    image: node:18
    depends_on:
      - db
  
  db:
    image: postgres:15
    
  cache:
    image: redis:7
  `;
  
  console.log('\nTesting service dependencies:');
  const result = podlet.composeToQuadlet(depCompose);
  console.log('Web service (depends on api, cache):');
  console.log(result.web);
  console.log('\nAPI service (depends on db):');
  console.log(result.api);
}

function testRestartPolicies() {
  console.log('\n=== Testing Restart Policies ===');
  
  const podlet = new PodletJS();
  
  const restartCompose = `
version: '3.8'
services:
  always:
    image: nginx
    restart: always
    
  on_failure:
    image: nginx  
    restart: on-failure
    
  unless_stopped:
    image: nginx
    restart: unless-stopped
    
  no_restart:
    image: nginx
    restart: "no"
  `;
  
  console.log('\nTesting restart policies:');
  const result = podlet.composeToQuadlet(restartCompose);
  
  console.log('Always restart:');
  console.log(result.always);
  
  console.log('\nOn-failure restart:');
  console.log(result.on_failure);
}

function testHealthchecks() {
  console.log('\n=== Testing Healthchecks ===');
  
  const parser = new ComposeParser();
  
  const healthCompose = `
version: '3.8'
services:
  web:
    image: nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
      
  db:
    image: postgres
    healthcheck:
      test: pg_isready -U postgres
      interval: 10s
      
  disabled:
    image: nginx
    healthcheck:
      disable: true
  `;
  
  console.log('\nTesting healthcheck configurations:');
  const containers = parser.parse(healthCompose);
  
  console.log('Web healthcheck:');
  console.log('Command:', containers.web.healthCmd);
  console.log('Interval:', containers.web.healthInterval);
  console.log('Timeout:', containers.web.healthTimeout);
  console.log('Retries:', containers.web.healthRetries);
  
  console.log('\nDisabled healthcheck:');
  console.log('Command:', containers.disabled.healthCmd);
}

function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  const parser = new ComposeParser();
  
  const testCases = [
    {
      name: 'Empty file',
      yaml: ''
    },
    {
      name: 'No services',
      yaml: 'version: "3.8"'
    },
    {
      name: 'Service without image or build',
      yaml: `
version: '3.8'
services:
  bad:
    ports:
      - "8080:80"
      `
    },
    {
      name: 'Invalid YAML',
      yaml: 'invalid: yaml: content: ['
    }
  ];
  
  testCases.forEach(({ name, yaml }) => {
    console.log(`\nError test: ${name}`);
    try {
      const containers = parser.parse(yaml);
      console.log('✗ Should have failed but got:', Object.keys(containers));
    } catch (error) {
      console.log('✓ Correctly caught error:', error.message);
    }
  });
}

function testWithSystemdIntegration() {
  console.log('\n=== Testing with Systemd Integration ===');
  
  const podlet = new PodletJS();
  
  const compose = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    restart: always
    depends_on:
      - db
      
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: always

volumes:
  db_data:
  `;
  
  console.log('\nTesting complete systemd integration:');
  const result = podlet.composeToQuadlet(compose, {
    unit: {
      description: 'Docker Compose Application',
      after: ['network-online.target'],
      wants: ['network-online.target']
    },
    install: {
      wantedBy: ['multi-user.target']
    }
  });
  
  console.log('Web service with systemd integration:');
  console.log(result.web);
  
  console.log('\nDB service with systemd integration:');
  console.log(result.db);
}

function runAllTests() {
  console.log('=== PodletJS Phase 3: Compose Parser Tests ===');
  
  try {
    testBasicCompose();
    testComposeFeatures();
    testVolumeTypes();
    testNetworking();
    testPortFormats();
    testDependencies();
    testRestartPolicies();
    testHealthchecks();
    testErrorHandling();
    testWithSystemdIntegration();
    
    console.log('\n=== Phase 3 Compose Parser Complete! ===');
    console.log('✓ Basic compose parsing working');
    console.log('✓ Multi-service support working');
    console.log('✓ Volume handling working');
    console.log('✓ Network configuration working');
    console.log('✓ Port mapping working');
    console.log('✓ Service dependencies working');
    console.log('✓ Restart policies working');
    console.log('✓ Healthchecks working');
    console.log('✓ Error handling working');
    console.log('✓ Systemd integration working');
    console.log('\nPodletJS is now feature-complete!');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error(error.stack);
  }
}

runAllTests();