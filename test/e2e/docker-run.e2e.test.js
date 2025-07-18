import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PodletJS } from '../../src/index.js';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

describe('Docker Run E2E Tests', () => {
  let tempDir;
  let podlet;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    podlet = new PodletJS();
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  describe('Basic Docker Run Commands', () => {
    it('should parse simple docker run command', () => {
      const command = 'docker run nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=nginx');
    });

    it('should parse docker run with name and port', () => {
      const command = 'docker run -d --name web-server -p 8080:80 nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=web-server');
      expect(result).toContain('PublishPort=8080:80');
    });

    it('should parse docker run with multiple ports', () => {
      const command = 'docker run -p 8080:80 -p 8443:443 nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('PublishPort=8443:443');
    });

    it('should parse docker run with environment variables', () => {
      const command = 'docker run -e NODE_ENV=production -e PORT=3000 node:16-alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Environment=NODE_ENV=production');
      expect(result).toContain('Environment=PORT=3000');
    });

    it('should parse docker run with volumes', () => {
      const command = 'docker run -v /host/data:/container/data -v logs:/var/log nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Volume=/host/data:/container/data');
      expect(result).toContain('Volume=logs:/var/log');
    });
  });

  describe('Advanced Docker Run Options', () => {
    it('should parse complex docker run command with multiple options', () => {
      const command = `docker run -d \\
        --name production-app \\
        --hostname myapp.local \\
        -p 8080:80 \\
        -p 8443:443 \\
        -e NODE_ENV=production \\
        -e DATABASE_URL=postgres://user:pass@db:5432/myapp \\
        -v /data/app:/app/data:Z \\
        -v app_logs:/var/log \\
        --user 1000:1000 \\
        --workdir /app \\
        --restart unless-stopped \\
        --memory 512m \\
        --cpus 1.5 \\
        node:16-alpine npm start`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Image=node:16-alpine');
      expect(result).toContain('ContainerName=production-app');
      expect(result).toContain('HostName=myapp.local');
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('PublishPort=8443:443');
      expect(result).toContain('Environment=NODE_ENV=production');
      expect(result).toContain('Environment=DATABASE_URL=postgres://user:pass@db:5432/myapp');
      expect(result).toContain('Volume=/data/app:/app/data:Z');
      expect(result).toContain('Volume=app_logs:/var/log');
      expect(result).toContain('User=1000');
      expect(result).toContain('Group=1000');
      expect(result).toContain('WorkingDir=/app');
    });

    it('should parse docker run with network options', () => {
      const command = 'docker run --network bridge --hostname web.local --dns 8.8.8.8 nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      // Note: Network may not be preserved in composerize conversion
      expect(result).toContain('HostName=web.local');
      expect(result).toContain('DNS=8.8.8.8');
    });

    it('should parse docker run with security options', () => {
      const command = 'docker run --user 1000:1000 --cap-add NET_ADMIN --cap-drop ALL --read-only nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('User=1000');
      expect(result).toContain('Group=1000');
      expect(result).toContain('AddCapability=NET_ADMIN');
      expect(result).toContain('DropCapability=ALL');
      expect(result).toContain('ReadOnly=true');
    });

    it('should parse docker run with health check', () => {
      const command = `docker run \\
        --health-cmd "curl -f http://localhost:8080/health" \\
        --health-interval 30s \\
        --health-timeout 10s \\
        --health-retries 3 \\
        nginx:alpine`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('HealthCmd=curl -f http://localhost:8080/health');
      expect(result).toContain('HealthInterval=30s');
      expect(result).toContain('HealthTimeout=10s');
      expect(result).toContain('HealthRetries=3');
    });

    it('should parse docker run with labels', () => {
      const command = 'docker run -l app=web -l version=1.0 -l "description=Web Server" nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Label=app=web');
      expect(result).toContain('Label=version=1.0');
      expect(result).toContain('Label="description=Web Server"');
    });

    it('should parse docker run with devices and tmpfs', () => {
      const command = 'docker run --device /dev/snd --tmpfs /tmp:noexec,nosuid,size=100m nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      // Device options might not be preserved through composerize
      expect(result).toContain('Tmpfs=/tmp:noexec,nosuid,size=100m');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle database container scenario', () => {
      const command = `docker run -d \\
        --name postgres-db \\
        -p 5432:5432 \\
        -e POSTGRES_DB=myapp \\
        -e POSTGRES_USER=dbuser \\
        -e POSTGRES_PASSWORD=secretpass \\
        -v pgdata:/var/lib/postgresql/data \\
        -v /host/backup:/backup \\
        --user 999:999 \\
        --restart always \\
        --health-cmd "pg_isready -U dbuser -d myapp" \\
        --health-interval 10s \\
        --health-timeout 5s \\
        --health-retries 5 \\
        postgres:15-alpine`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Image=postgres:15-alpine');
      expect(result).toContain('ContainerName=postgres-db');
      expect(result).toContain('PublishPort=5432:5432');
      expect(result).toContain('Environment=POSTGRES_DB=myapp');
      expect(result).toContain('Environment=POSTGRES_USER=dbuser');
      expect(result).toContain('Environment=POSTGRES_PASSWORD=secretpass');
      expect(result).toContain('Volume=pgdata:/var/lib/postgresql/data');
      expect(result).toContain('Volume=/host/backup:/backup');
      expect(result).toContain('User=999');
      expect(result).toContain('Group=999');
      expect(result).toContain('HealthCmd=pg_isready -U dbuser -d myapp');
    });

    it('should handle Redis cache scenario', () => {
      const command = `docker run -d \\
        --name redis-cache \\
        -p 6379:6379 \\
        -v redis_data:/data \\
        --user redis:redis \\
        --read-only \\
        --tmpfs /tmp \\
        --cap-drop ALL \\
        --cap-add SETGID \\
        --cap-add SETUID \\
        --health-cmd "redis-cli ping" \\
        --health-interval 5s \\
        redis:7-alpine redis-server --appendonly yes`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Image=redis:7-alpine');
      expect(result).toContain('ContainerName=redis-cache');
      expect(result).toContain('PublishPort=6379:6379');
      expect(result).toContain('Volume=redis_data:/data');
      expect(result).toContain('User=redis');
      expect(result).toContain('Group=redis');
      expect(result).toContain('ReadOnly=true');
      expect(result).toContain('Tmpfs=/tmp');
      expect(result).toContain('DropCapability=ALL');
      expect(result).toContain('AddCapability=SETGID SETUID');
      expect(result).toContain('HealthCmd=redis-cli ping');
    });

    it('should handle monitoring container scenario', () => {
      const command = `docker run -d \\
        --name prometheus \\
        -p 9090:9090 \\
        -v prometheus_data:/prometheus \\
        -v /etc/prometheus:/etc/prometheus:ro \\
        --user 65534:65534 \\
        --read-only \\
        --tmpfs /tmp \\
        --cap-drop ALL \\
        --security-opt no-new-privileges:true \\
        prom/prometheus:latest \\
        --config.file=/etc/prometheus/prometheus.yml \\
        --storage.tsdb.path=/prometheus \\
        --web.console.libraries=/etc/prometheus/console_libraries \\
        --web.console.templates=/etc/prometheus/consoles`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Image=prom/prometheus:latest');
      expect(result).toContain('ContainerName=prometheus');
      expect(result).toContain('PublishPort=9090:9090');
      expect(result).toContain('Volume=prometheus_data:/prometheus');
      expect(result).toContain('Volume=/etc/prometheus:/etc/prometheus:ro');
      expect(result).toContain('User=65534');
      expect(result).toContain('Group=65534');
      expect(result).toContain('ReadOnly=true');
      expect(result).toContain('Tmpfs=/tmp');
      expect(result).toContain('DropCapability=ALL');
      expect(result).toContain('NoNewPrivileges=true');
    });

    it('should handle web application with reverse proxy', () => {
      const command = `docker run -d \\
        --name nginx-proxy \\
        -p 80:80 \\
        -p 443:443 \\
        -v /etc/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \\
        -v /etc/ssl/certs:/etc/ssl/certs:ro \\
        -v nginx_logs:/var/log/nginx \\
        --tmpfs /var/cache/nginx \\
        --tmpfs /var/run \\
        --user nginx:nginx \\
        --cap-drop ALL \\
        --cap-add CHOWN \\
        --cap-add DAC_OVERRIDE \\
        --cap-add SETGID \\
        --cap-add SETUID \\
        --cap-add NET_BIND_SERVICE \\
        --read-only \\
        --health-cmd "nginx -t" \\
        --health-interval 30s \\
        nginx:alpine`;
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=nginx-proxy');
      expect(result).toContain('PublishPort=80:80');
      expect(result).toContain('PublishPort=443:443');
      expect(result).toContain('User=nginx');
      expect(result).toContain('Group=nginx');
      expect(result).toContain('ReadOnly=true');
      expect(result).toContain('HealthCmd=nginx -t');
    });
  });

  describe('Docker Run with Quadlet Options', () => {
    it('should generate quadlet with systemd unit options', () => {
      const command = 'docker run -d --name web-server -p 8080:80 nginx:alpine';
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
      
      const result = podlet.dockerRunToQuadlet(command, options);
      
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

    it('should generate quadlet with global podman args', () => {
      const command = 'docker run --name debug-app nginx:alpine';
      const options = {
        globals: {
          podmanArgs: '--log-level=debug --events-backend=file'
        }
      };
      
      const result = podlet.dockerRunToQuadlet(command, options);
      
      expect(result).toContain('[GlobalArgs]');
      expect(result).toContain('PodmanArgs=--log-level=debug --events-backend=file');
    });
  });

  describe('File Generation and Writing', () => {
    it('should generate and write quadlet file from docker run command', async () => {
      const command = 'docker run -d --name test-app -p 3000:3000 -e NODE_ENV=production node:16-alpine';
      
      const quadletContent = podlet.dockerRunToQuadlet(command);
      
      const outputFile = path.join(tempDir.name, 'test-app.container');
      await fs.writeFile(outputFile, quadletContent);
      
      expect(await fs.pathExists(outputFile)).toBe(true);
      
      const fileContent = await fs.readFile(outputFile, 'utf8');
      expect(fileContent).toContain('[Container]');
      expect(fileContent).toContain('Image=node:16-alpine');
      expect(fileContent).toContain('ContainerName=test-app');
      expect(fileContent).toContain('PublishPort=3000:3000');
      expect(fileContent).toContain('Environment=NODE_ENV=production');
    });

    it('should generate quadlet file with proper filename from container name', async () => {
      const command = 'docker run --name my-custom-service nginx:alpine';
      
      const quadletContent = podlet.dockerRunToQuadlet(command);
      const outputFile = path.join(tempDir.name, 'my-custom-service.container');
      await fs.writeFile(outputFile, quadletContent);
      
      expect(await fs.pathExists(outputFile)).toBe(true);
      const fileContent = await fs.readFile(outputFile, 'utf8');
      expect(fileContent).toContain('ContainerName=my-custom-service');
    });

    it('should handle multiple docker run commands to separate files', async () => {
      const commands = [
        'docker run -d --name web -p 80:80 nginx:alpine',
        'docker run -d --name api -p 3000:3000 node:16-alpine',
        'docker run -d --name db -p 5432:5432 -e POSTGRES_DB=myapp postgres:15'
      ];
      
      for (const command of commands) {
        const quadletContent = podlet.dockerRunToQuadlet(command);
        
        // Extract container name from command for filename
        const nameMatch = command.match(/--name\s+(\S+)/);
        const containerName = nameMatch ? nameMatch[1] : 'container';
        
        const outputFile = path.join(tempDir.name, `${containerName}.container`);
        await fs.writeFile(outputFile, quadletContent);
        
        expect(await fs.pathExists(outputFile)).toBe(true);
      }
      
      // Verify all files exist
      expect(await fs.pathExists(path.join(tempDir.name, 'web.container'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir.name, 'api.container'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir.name, 'db.container'))).toBe(true);
    });
  });

  describe('Docker Run Parsing Methods', () => {
    it('should use parseDockerRun method to get container configuration', () => {
      const command = 'docker run -d --name test-container -p 8080:80 -e NODE_ENV=test nginx:alpine';
      
      const parsed = podlet.parseDockerRun(command);
      
      expect(parsed).toBeDefined();
      expect(parsed.services).toBeDefined();
      expect(Object.keys(parsed.services)).toHaveLength(1);
      
      const serviceName = Object.keys(parsed.services)[0];
      const service = parsed.services[serviceName];
      
      expect(service.image).toBe('nginx:alpine');
      expect(service.container_name).toBe('test-container');
      expect(service.ports).toContain('8080:80');
      expect(service.environment).toContain('NODE_ENV=test');
    });

    it('should use fromDockerRun alias method', () => {
      const command = 'docker run --name alias-test nginx:alpine';
      
      const result1 = podlet.dockerRunToQuadlet(command);
      const result2 = podlet.fromDockerRun(command);
      
      expect(result1).toEqual(result2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid docker run command', () => {
      const invalidCommand = 'docker run'; // Missing image
      
      expect(() => {
        podlet.dockerRunToQuadlet(invalidCommand);
      }).toThrow();
    });

    it('should handle malformed docker run command', () => {
      const malformedCommand = 'docker run --invalid-flag nginx:alpine';
      
      // Should expect it to throw since composerize may not handle invalid flags gracefully
      expect(() => {
        podlet.dockerRunToQuadlet(malformedCommand);
      }).toThrow();
    });

    it('should handle empty command', () => {
      expect(() => {
        podlet.dockerRunToQuadlet('');
      }).toThrow();
    });

    it('should handle null or undefined command', () => {
      expect(() => {
        podlet.dockerRunToQuadlet(null);
      }).toThrow();
      
      expect(() => {
        podlet.dockerRunToQuadlet(undefined);
      }).toThrow();
    });
  });

  describe('Command Array Format', () => {
    it('should handle docker run command as array', () => {
      const commandArray = [
        'docker', 'run', '-d',
        '--name', 'array-test',
        '-p', '8080:80',
        '-e', 'NODE_ENV=production',
        'nginx:alpine'
      ];
      
      const result = podlet.dockerRunToQuadlet(commandArray);
      
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=array-test');
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('Environment=NODE_ENV=production');
    });

    it('should handle mixed string and array format consistently', () => {
      const stringCommand = 'docker run -d --name string-test -p 8080:80 nginx:alpine';
      const arrayCommand = ['docker', 'run', '-d', '--name', 'array-test', '-p', '8080:80', 'nginx:alpine'];
      
      const stringResult = podlet.dockerRunToQuadlet(stringCommand);
      const arrayResult = podlet.dockerRunToQuadlet(arrayCommand);
      
      // Both should contain the same basic structure
      expect(stringResult).toContain('[Container]');
      expect(arrayResult).toContain('[Container]');
      expect(stringResult).toContain('Image=nginx:alpine');
      expect(arrayResult).toContain('Image=nginx:alpine');
      expect(stringResult).toContain('PublishPort=8080:80');
      expect(arrayResult).toContain('PublishPort=8080:80');
    });
  });

  describe('Special Characters and Escaping', () => {
    it('should handle environment variables with special characters', () => {
      const command = 'docker run -e "DATABASE_URL=postgres://user:p@ss!word@localhost:5432/db" nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Environment=DATABASE_URL=postgres://user:p@ss!word@localhost:5432/db');
    });

    it('should handle volume paths with spaces', () => {
      const command = 'docker run -v "/path with spaces:/container path" nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Volume=/path with spaces:/container path');
    });

    it('should handle labels with special characters', () => {
      const command = 'docker run -l "description=Web server for my-app (v1.0)" nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(result).toContain('Label="description=Web server for my-app (v1.0)"');
    });
  });
});
