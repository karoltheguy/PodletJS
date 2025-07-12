import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QuadletGenerator } from '../../src/quadlet-generator.js';
import { Container } from '../../src/container.js';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

describe('QuadletGenerator E2E Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  describe('Complete Quadlet File Generation', () => {
    it('should generate a production-ready web server quadlet file', async () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      container.setContainerName('production-web');
      container.addPublishPort('443:443');
      container.addPublishPort('80:80');
      container.addVolume('/etc/ssl/certs:/etc/ssl/certs:ro');
      container.addVolume('/var/www/html:/usr/share/nginx/html:ro');
      container.addVolume('/etc/nginx/conf.d:/etc/nginx/conf.d:ro');
      container.addEnvironment('NGINX_HOST=production.example.com');
      container.addLabel('service=web');
      container.addLabel('tier=frontend');
      container.user = 'nginx:nginx';
      container.readOnly = true;
      container.noNewPrivileges = true;
      container.dropCapability.push('ALL');
      container.addCapability.push('CHOWN');
      container.addCapability.push('SETGID');
      container.addCapability.push('SETUID');
      container.healthCmd = 'curl -f http://localhost/health || exit 1';
      container.healthInterval = '30s';
      container.healthTimeout = '10s';
      container.healthRetries = 3;

      const options = {
        unit: {
          description: 'Production Web Server',
          after: ['network-online.target'],
          wants: ['network-online.target'],
          requires: ['network.target']
        },
        service: {
          restart: 'always',
          restartSec: '10'
        },
        install: {
          wantedBy: ['multi-user.target']
        },
        globals: {
          podmanArgs: '--log-level=warn'
        }
      };

      const quadletContent = QuadletGenerator.generateFile(container, options);
      
      // Write to file
      const outputFile = path.join(tempDir.name, 'production-web.container');
      await fs.writeFile(outputFile, quadletContent);
      
      // Verify file exists and has correct content
      expect(await fs.pathExists(outputFile)).toBe(true);
      const fileContent = await fs.readFile(outputFile, 'utf8');
      
      // Verify all sections are present
      expect(fileContent).toContain('[Unit]');
      expect(fileContent).toContain('[Container]');
      expect(fileContent).toContain('[GlobalArgs]');
      expect(fileContent).toContain('[Service]');
      expect(fileContent).toContain('[Install]');
      
      // Verify Unit section
      expect(fileContent).toContain('Description=Production Web Server');
      expect(fileContent).toContain('After=network-online.target');
      expect(fileContent).toContain('Wants=network-online.target');
      expect(fileContent).toContain('Requires=network.target');
      
      // Verify Container section
      expect(fileContent).toContain('Image=nginx:alpine');
      expect(fileContent).toContain('ContainerName=production-web');
      expect(fileContent).toContain('PublishPort=443:443');
      expect(fileContent).toContain('PublishPort=80:80');
      expect(fileContent).toContain('Volume=/etc/ssl/certs:/etc/ssl/certs:ro');
      expect(fileContent).toContain('Environment=NGINX_HOST=production.example.com');
      expect(fileContent).toContain('Label=service=web');
      expect(fileContent).toContain('User=nginx:nginx');
      expect(fileContent).toContain('ReadOnly=true');
      expect(fileContent).toContain('NoNewPrivileges=true');
      expect(fileContent).toContain('DropCapability=ALL');
      expect(fileContent).toContain('AddCapability=CHOWN SETGID SETUID');
      expect(fileContent).toContain('HealthCmd=curl -f http://localhost/health || exit 1');
      expect(fileContent).toContain('HealthInterval=30s');
      
      // Verify Service section
      expect(fileContent).toContain('Restart=always');
      expect(fileContent).toContain('RestartSec=10');
      
      // Verify Install section
      expect(fileContent).toContain('WantedBy=multi-user.target');
      
      // Verify GlobalArgs section
      expect(fileContent).toContain('PodmanArgs=--log-level=warn');
    });

    it('should generate a database quadlet with proper security settings', async () => {
      const container = new Container();
      container.setImage('postgres:15-alpine');
      container.setContainerName('production-db');
      container.addPublishPort('5432:5432');
      container.addVolume('postgres_data:/var/lib/postgresql/data:Z');
      container.addVolume('/etc/postgresql/postgresql.conf:/etc/postgresql/postgresql.conf:ro');
      container.addEnvironment('POSTGRES_DB=myapp');
      container.addEnvironment('POSTGRES_USER=appuser');
      container.addEnvironment('POSTGRES_PASSWORD=supersecret');
      container.addEnvironment('PGDATA=/var/lib/postgresql/data/pgdata');
      container.user = 'postgres:postgres';
      container.noNewPrivileges = true;
      container.dropCapability.push('ALL');
      container.addCapability.push('SETGID');
      container.addCapability.push('SETUID');
      container.addCapability.push('DAC_READ_SEARCH');
      container.healthCmd = 'pg_isready -U appuser -d myapp';
      container.healthInterval = '10s';
      container.healthTimeout = '5s';
      container.healthRetries = 5;
      container.healthStartPeriod = '60s';
      container.shmSize = '256m';
      container.ulimit.push('nofile=1024:1024');
      container.sysctl.push('kernel.shmmax=134217728');

      const options = {
        unit: {
          description: 'Production PostgreSQL Database',
          after: ['network.target'],
          requires: ['network.target']
        },
        service: {
          restart: 'on-failure',
          restartSec: '30'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };

      const quadletContent = QuadletGenerator.generateFile(container, options);
      
      // Write to file
      const outputFile = path.join(tempDir.name, 'production-db.container');
      await fs.writeFile(outputFile, quadletContent);
      
      // Verify file content
      const fileContent = await fs.readFile(outputFile, 'utf8');
      
      expect(fileContent).toContain('Image=postgres:15-alpine');
      expect(fileContent).toContain('ContainerName=production-db');
      expect(fileContent).toContain('Volume=postgres_data:/var/lib/postgresql/data:Z');
      expect(fileContent).toContain('Environment=POSTGRES_DB=myapp');
      expect(fileContent).toContain('User=postgres:postgres');
      expect(fileContent).toContain('NoNewPrivileges=true');
      expect(fileContent).toContain('DropCapability=ALL');
      expect(fileContent).toContain('AddCapability=SETGID SETUID DAC_READ_SEARCH');
      expect(fileContent).toContain('HealthCmd=pg_isready -U appuser -d myapp');
      expect(fileContent).toContain('ShmSize=256m');
      expect(fileContent).toContain('Ulimit=nofile=1024:1024');
      expect(fileContent).toContain('Sysctl=kernel.shmmax=134217728');
    });

    it('should generate a microservice quadlet with networking and monitoring', async () => {
      const container = new Container();
      container.setImage('node:18-alpine');
      container.setContainerName('api-service');
      container.addPublishPort('3000:3000');
      container.addVolume('./app:/usr/src/app:ro');
      container.addVolume('node_modules:/usr/src/app/node_modules');
      container.addEnvironment('NODE_ENV=production');
      container.addEnvironment('PORT=3000');
      container.addEnvironment('DATABASE_URL=postgresql://user:pass@db:5432/myapp');
      container.addLabel('service=api');
      container.addLabel('version=1.0.0');
      container.addLabel('maintainer=devops@example.com');
      container.network.push('backend');
      container.network.push('monitoring');
      container.networkAlias.push('api');
      container.workingDir = '/usr/src/app';
      container.setExec('node server.js');
      container.user = 'node:node';
      container.readOnly = true;
      container.tmpfs.push('/tmp');
      container.tmpfs.push('/usr/src/app/logs:size=100m');
      container.noNewPrivileges = true;
      container.dropCapability.push('ALL');
      container.healthCmd = 'curl -f http://localhost:3000/health';
      container.healthInterval = '30s';
      container.healthTimeout = '10s';
      container.healthRetries = 3;
      container.healthStartPeriod = '40s';
      container.stopSignal = 'SIGINT';
      container.stopTimeout = 30;
      container.logDriver = 'journald';
      container.logOpt.push('tag=api-service');

      const options = {
        unit: {
          description: 'API Microservice',
          after: ['network.target', 'production-db.service'],
          wants: ['network-online.target'],
          requires: ['production-db.service']
        },
        service: {
          restart: 'on-failure',
          restartSec: '5'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };

      const quadletContent = QuadletGenerator.generateFile(container, options);
      
      // Write to file
      const outputFile = path.join(tempDir.name, 'api-service.container');
      await fs.writeFile(outputFile, quadletContent);
      
      // Verify file content
      const fileContent = await fs.readFile(outputFile, 'utf8');
      
      expect(fileContent).toContain('Image=node:18-alpine');
      expect(fileContent).toContain('ContainerName=api-service');
      expect(fileContent).toContain('Exec=node server.js');
      expect(fileContent).toContain('WorkingDir=/usr/src/app');
      expect(fileContent).toContain('Network=backend');
      expect(fileContent).toContain('Network=monitoring');
      expect(fileContent).toContain('NetworkAlias=api');
      expect(fileContent).toContain('Tmpfs=/tmp');
      expect(fileContent).toContain('Tmpfs=/usr/src/app/logs:size=100m');
      expect(fileContent).toContain('StopSignal=SIGINT');
      expect(fileContent).toContain('StopTimeout=30');
      expect(fileContent).toContain('LogDriver=journald');
      expect(fileContent).toContain('LogOpt=tag=api-service');
      expect(fileContent).toContain('Requires=production-db.service');
    });
  });

  describe('Multi-container Stack Generation', () => {
    it('should generate a complete LAMP stack', async () => {
      // Apache/PHP container
      const webContainer = new Container();
      webContainer.setImage('php:8.1-apache');
      webContainer.setContainerName('lamp-web');
      webContainer.addPublishPort('80:80');
      webContainer.addVolume('./www:/var/www/html');
      webContainer.addVolume('./apache-config:/etc/apache2/sites-available');
      webContainer.addEnvironment('APACHE_DOCUMENT_ROOT=/var/www/html');
      webContainer.network.push('lamp-network');
      webContainer.networkAlias.push('web');

      // MySQL container
      const dbContainer = new Container();
      dbContainer.setImage('mysql:8.0');
      dbContainer.setContainerName('lamp-mysql');
      dbContainer.addVolume('mysql_data:/var/lib/mysql');
      dbContainer.addEnvironment('MYSQL_ROOT_PASSWORD=rootpass');
      dbContainer.addEnvironment('MYSQL_DATABASE=webapp');
      dbContainer.addEnvironment('MYSQL_USER=webuser');
      dbContainer.addEnvironment('MYSQL_PASSWORD=webpass');
      dbContainer.network.push('lamp-network');
      dbContainer.networkAlias.push('mysql');

      // PHPMyAdmin container
      const pmaContainer = new Container();
      pmaContainer.setImage('phpmyadmin:latest');
      pmaContainer.setContainerName('lamp-phpmyadmin');
      pmaContainer.addPublishPort('8080:80');
      pmaContainer.addEnvironment('PMA_HOST=mysql');
      pmaContainer.addEnvironment('PMA_USER=webuser');
      pmaContainer.addEnvironment('PMA_PASSWORD=webpass');
      pmaContainer.network.push('lamp-network');

      const containers = [
        { name: 'lamp-web', container: webContainer },
        { name: 'lamp-mysql', container: dbContainer },
        { name: 'lamp-phpmyadmin', container: pmaContainer }
      ];

      const commonOptions = {
        unit: {
          after: ['network.target'],
          wants: ['network-online.target']
        },
        service: {
          restart: 'on-failure',
          restartSec: '10'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };

      // Generate all container files
      for (const { name, container } of containers) {
        const options = {
          ...commonOptions,
          unit: {
            ...commonOptions.unit,
            description: `LAMP Stack - ${name}`
          }
        };

        const quadletContent = QuadletGenerator.generateFile(container, options);
        const outputFile = path.join(tempDir.name, `${name}.container`);
        await fs.writeFile(outputFile, quadletContent);
        
        expect(await fs.pathExists(outputFile)).toBe(true);
      }

      // Verify web container
      const webContent = await fs.readFile(path.join(tempDir.name, 'lamp-web.container'), 'utf8');
      expect(webContent).toContain('Image=php:8.1-apache');
      expect(webContent).toContain('PublishPort=80:80');
      expect(webContent).toContain('Network=lamp-network');

      // Verify MySQL container
      const dbContent = await fs.readFile(path.join(tempDir.name, 'lamp-mysql.container'), 'utf8');
      expect(dbContent).toContain('Image=mysql:8.0');
      expect(dbContent).toContain('Environment=MYSQL_DATABASE=webapp');
      expect(dbContent).toContain('Volume=mysql_data:/var/lib/mysql');

      // Verify PHPMyAdmin container
      const pmaContent = await fs.readFile(path.join(tempDir.name, 'lamp-phpmyadmin.container'), 'utf8');
      expect(pmaContent).toContain('Image=phpmyadmin:latest');
      expect(pmaContent).toContain('PublishPort=8080:80');
      expect(pmaContent).toContain('Environment=PMA_HOST=mysql');
    });
  });

  describe('Validation and Best Practices', () => {
    it('should generate valid quadlet files that follow systemd conventions', async () => {
      const container = new Container();
      container.setImage('redis:7-alpine');
      container.setContainerName('cache-redis');
      container.addPublishPort('6379:6379');
      container.addVolume('redis_data:/data');
      container.addEnvironment('REDIS_PASSWORD=cachepass');

      const options = {
        unit: {
          description: 'Redis Cache Server',
          after: ['network.target']
        },
        service: {
          restart: 'always'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };

      const quadletContent = QuadletGenerator.generateFile(container, options);
      const outputFile = path.join(tempDir.name, 'cache-redis.container');
      await fs.writeFile(outputFile, quadletContent);
      
      const fileContent = await fs.readFile(outputFile, 'utf8');
      
      // Verify proper section ordering
      const unitIndex = fileContent.indexOf('[Unit]');
      const containerIndex = fileContent.indexOf('[Container]');
      const serviceIndex = fileContent.indexOf('[Service]');
      const installIndex = fileContent.indexOf('[Install]');
      
      expect(unitIndex).toBeLessThan(containerIndex);
      expect(containerIndex).toBeLessThan(serviceIndex);
      expect(serviceIndex).toBeLessThan(installIndex);
      
      // Verify no empty lines within sections
      const lines = fileContent.split('\n');
      let inSection = false;
      let sectionName = '';
      
      for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
          inSection = true;
          sectionName = line;
          continue;
        }
        
        if (inSection && line.trim() === '') {
          // Empty line should end the section
          inSection = false;
          continue;
        }
        
        if (inSection && !line.includes('=')) {
          // Invalid line in section (except for section headers)
          if (!line.startsWith('[')) {
            fail(`Invalid line in ${sectionName}: ${line}`);
          }
        }
      }
    });

    it('should handle special characters and escaping properly', async () => {
      const container = new Container();
      container.setImage('app:latest');
      container.setContainerName('special-chars-app');
      container.addEnvironment('MESSAGE=Hello "World" with spaces');
      container.addEnvironment('PATH_VAR=/path/with spaces/and:colons');
      container.addLabel('description=An app with "quotes" and spaces');
      container.addLabel('build.args=--flag="value with spaces"');

      const quadletContent = QuadletGenerator.generateContainerSection(container);
      
      expect(quadletContent).toContain('Environment="MESSAGE=Hello \\"World\\" with spaces"');
      expect(quadletContent).toContain('Environment="PATH_VAR=/path/with spaces/and:colons"');
      expect(quadletContent).toContain('Label="description=An app with \\"quotes\\" and spaces"');
      expect(quadletContent).toContain('Label="build.args=--flag=\\"value with spaces\\""');
    });
  });
});
