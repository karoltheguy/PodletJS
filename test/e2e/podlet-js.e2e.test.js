import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QuadletGenerator } from '../../src/quadlet-generator.js';
import { Container } from '../../src/container.js';
import { ComposeParser } from '../../src/compose-parser.js';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

describe('PodletJS E2E Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  describe('Container to Quadlet Generation', () => {
    it('should generate quadlet file from container configuration', () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      container.setContainerName('web-server');
      container.addPublishPort('8080:80');
      
      const result = QuadletGenerator.generateFile(container);
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=web-server');
      expect(result).toContain('PublishPort=8080:80');
    });

    it('should generate complex container configuration', () => {
      const container = new Container();
      container.setImage('postgres:13');
      container.setContainerName('database');
      container.addPublishPort('5432:5432');
      container.addEnvironment('POSTGRES_DB=myapp');
      container.addEnvironment('POSTGRES_USER=user');
      container.addEnvironment('POSTGRES_PASSWORD=secret');
      container.addVolume('/data/postgres:/var/lib/postgresql/data:Z');
      container.user = '999:999';
      container.dropCapability.push('ALL');
      container.addCapability.push('SETGID');
      container.addCapability.push('SETUID');
      
      const result = QuadletGenerator.generateFile(container);
      
      expect(result).toContain('Image=postgres:13');
      expect(result).toContain('ContainerName=database');
      expect(result).toContain('PublishPort=5432:5432');
      expect(result).toContain('Environment=POSTGRES_DB=myapp');
      expect(result).toContain('Environment=POSTGRES_USER=user');
      expect(result).toContain('Environment=POSTGRES_PASSWORD=secret');
      expect(result).toContain('Volume=/data/postgres:/var/lib/postgresql/data:Z');
      expect(result).toContain('User=999:999');
      expect(result).toContain('DropCapability=ALL');
      expect(result).toContain('AddCapability=SETGID SETUID');
    });

    it('should handle container with network options', () => {
      const container = new Container();
      container.setImage('redis:alpine');
      container.setContainerName('app');
      container.network.push('frontend');
      container.networkAlias.push('web');
      container.dns.push('8.8.8.8');
      container.hostName = 'myapp';
      
      const result = QuadletGenerator.generateFile(container);
      
      expect(result).toContain('Image=redis:alpine');
      expect(result).toContain('ContainerName=app');
      expect(result).toContain('Network=frontend');
      expect(result).toContain('NetworkAlias=web');
      expect(result).toContain('DNS=8.8.8.8');
      expect(result).toContain('HostName=myapp');
    });
  });

  describe('Docker Compose File Parsing', () => {
    it('should parse simple docker-compose.yml and generate quadlet files', async () => {
      const composeContent = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      - NGINX_HOST=example.com
    volumes:
      - ./html:/usr/share/nginx/html:ro
`;

      const composeFile = path.join(tempDir.name, 'docker-compose.yml');
      await fs.writeFile(composeFile, composeContent);
      
      const composeParser = new ComposeParser();
      const services = await composeParser.parseFile(composeFile);
      
      expect(services).toHaveProperty('web');
      const webContainer = services.web;
      
      const result = QuadletGenerator.generateFile(webContainer);
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('Environment=NGINX_HOST=example.com');
    });

    it('should parse multi-service docker-compose.yml', async () => {
      const composeContent = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    depends_on:
      - database
    networks:
      - frontend
      - backend
  
  database:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  db_data:
`;

      const composeFile = path.join(tempDir.name, 'docker-compose.yml');
      await fs.writeFile(composeFile, composeContent);
      
      const composeParser = new ComposeParser();
      const services = await composeParser.parseFile(composeFile);
      
      expect(services).toHaveProperty('web');
      expect(services).toHaveProperty('database');
      
      // Web service tests
      const webResult = QuadletGenerator.generateFile(services.web);
      expect(webResult).toContain('Image=nginx:alpine');
      expect(webResult).toContain('PublishPort=8080:80');
      expect(webResult).toContain('Network=frontend');
      expect(webResult).toContain('Network=backend');
      
      // Database service tests
      const dbResult = QuadletGenerator.generateFile(services.database);
      expect(dbResult).toContain('Image=postgres:13');
      expect(dbResult).toContain('Environment=POSTGRES_DB=myapp');
      expect(dbResult).toContain('Volume=db_data:/var/lib/postgresql/data');
      expect(dbResult).toContain('Network=backend');
    });
  });

  describe('File Generation and Writing', () => {
    it('should generate and write quadlet files to filesystem', async () => {
      const container = new Container();
      container.setImage('node:16-alpine');
      container.setContainerName('test-app');
      container.addPublishPort('3000:3000');
      
      const quadletContent = QuadletGenerator.generateFile(container);
      
      const outputFile = path.join(tempDir.name, 'test-app.container');
      await fs.writeFile(outputFile, quadletContent);
      
      expect(await fs.pathExists(outputFile)).toBe(true);
      
      const fileContent = await fs.readFile(outputFile, 'utf8');
      expect(fileContent).toContain('[Container]');
      expect(fileContent).toContain('Image=node:16-alpine');
      expect(fileContent).toContain('ContainerName=test-app');
      expect(fileContent).toContain('PublishPort=3000:3000');
    });

    it('should generate multiple quadlet files from compose', async () => {
      const composeContent = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  
  api:
    image: node:16-alpine
    ports:
      - "3000:3000"
`;

      const composeFile = path.join(tempDir.name, 'docker-compose.yml');
      await fs.writeFile(composeFile, composeContent);
      
      const composeParser = new ComposeParser();
      const services = await composeParser.parseFile(composeFile);
      
      // Write each service to its own .container file
      for (const [serviceName, container] of Object.entries(services)) {
        const quadletContent = QuadletGenerator.generateFile(container);
        const outputFile = path.join(tempDir.name, `${serviceName}.container`);
        await fs.writeFile(outputFile, quadletContent);
        
        expect(await fs.pathExists(outputFile)).toBe(true);
        
        const fileContent = await fs.readFile(outputFile, 'utf8');
        expect(fileContent).toContain('[Container]');
      }
      
      // Verify specific files exist
      expect(await fs.pathExists(path.join(tempDir.name, 'web.container'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir.name, 'api.container'))).toBe(true);
    });
  });

  describe('Advanced Quadlet Options', () => {
    it('should generate quadlet with Unit, Service, and Install sections', () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      container.setContainerName('production-app');
      container.addPublishPort('8080:80');
      
      const options = {
        unit: {
          description: 'Production Web Server',
          after: ['network.target'],
          wants: ['network-online.target']
        },
        service: {
          restart: 'always',
          restartSec: '10'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };
      
      const result = QuadletGenerator.generateFile(container, options);
      
      expect(result).toContain('[Unit]');
      expect(result).toContain('Description=Production Web Server');
      expect(result).toContain('After=network.target');
      expect(result).toContain('Wants=network-online.target');
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      
      expect(result).toContain('[Service]');
      expect(result).toContain('Restart=always');
      expect(result).toContain('RestartSec=10');
      
      expect(result).toContain('[Install]');
      expect(result).toContain('WantedBy=multi-user.target');
    });

    it('should generate quadlet with GlobalArgs section', () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      container.setContainerName('debug-app');
      
      const options = {
        globals: {
          podmanArgs: '--log-level=debug --events-backend=file'
        }
      };
      
      const result = QuadletGenerator.generateFile(container, options);
      
      expect(result).toContain('[GlobalArgs]');
      expect(result).toContain('PodmanArgs=--log-level=debug --events-backend=file');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid container configuration', () => {
      const container = new Container();
      // Container without image should fail validation
      
      expect(() => {
        container.validate();
      }).toThrow('Image is required');
    });

    it('should handle non-existent compose file', async () => {
      const nonExistentFile = path.join(tempDir.name, 'does-not-exist.yml');
      
      const composeParser = new ComposeParser();
      await expect(composeParser.parseFile(nonExistentFile)).rejects.toThrow();
    });

    it('should handle invalid compose YAML', async () => {
      const invalidYaml = `
version: 3.8
services:
  web:
    image: nginx
    ports
      - "80:80"
`;
      
      const composeFile = path.join(tempDir.name, 'invalid-compose.yml');
      await fs.writeFile(composeFile, invalidYaml);
      
      const composeParser = new ComposeParser();
      await expect(composeParser.parseFile(composeFile)).rejects.toThrow();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle WordPress with MySQL stack', async () => {
      const composeContent = `
version: '3.8'
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: mysql
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: secret
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wordpress_data:/var/www/html
    depends_on:
      - mysql
    networks:
      - wordpress-network

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - wordpress-network

volumes:
  wordpress_data:
  mysql_data:

networks:
  wordpress-network:
`;

      const composeFile = path.join(tempDir.name, 'wordpress-compose.yml');
      await fs.writeFile(composeFile, composeContent);
      
      const composeParser = new ComposeParser();
      const services = await composeParser.parseFile(composeFile);
      
      expect(services).toHaveProperty('wordpress');
      expect(services).toHaveProperty('mysql');
      
      // WordPress tests
      const wpResult = QuadletGenerator.generateFile(services.wordpress);
      expect(wpResult).toContain('Image=wordpress:latest');
      expect(wpResult).toContain('PublishPort=8080:80');
      expect(wpResult).toContain('Environment=WORDPRESS_DB_HOST=mysql');
      expect(wpResult).toContain('Volume=wordpress_data:/var/www/html');
      expect(wpResult).toContain('Network=wordpress-network');
      
      // MySQL tests
      const mysqlResult = QuadletGenerator.generateFile(services.mysql);
      expect(mysqlResult).toContain('Image=mysql:8.0');
      expect(mysqlResult).toContain('Environment=MYSQL_DATABASE=wordpress');
      expect(mysqlResult).toContain('Volume=mysql_data:/var/lib/mysql');
      expect(mysqlResult).toContain('Network=wordpress-network');
    });
  });
});
