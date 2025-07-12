import { QuadletGenerator } from '../../src/quadlet-generator.js';
import { Container } from '../../src/container.js';

describe('QuadletGenerator', () => {
  let container;

  beforeEach(() => {
    container = new Container();
    container.setImage('nginx:latest');
  });

  describe('generateFile', () => {
    it('should generate a basic quadlet file with container section only', () => {
      const result = QuadletGenerator.generateFile(container);
      
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:latest');
      expect(result).not.toContain('[Unit]');
      expect(result).not.toContain('[Service]');
      expect(result).not.toContain('[Install]');
    });

    it('should include Unit section when provided', () => {
      const unit = {
        description: 'Test container',
        after: ['network.target']
      };
      
      const result = QuadletGenerator.generateFile(container, { unit });
      
      expect(result).toContain('[Unit]');
      expect(result).toContain('Description=Test container');
      expect(result).toContain('After=network.target');
      expect(result).toContain('[Container]');
    });

    it('should include Service section when provided', () => {
      const service = {
        restart: 'always',
        restartSec: '30'
      };
      
      const result = QuadletGenerator.generateFile(container, { service });
      
      expect(result).toContain('[Service]');
      expect(result).toContain('Restart=always');
      expect(result).toContain('RestartSec=30');
    });

    it('should include Install section when provided', () => {
      const install = {
        wantedBy: ['multi-user.target', 'default.target']
      };
      
      const result = QuadletGenerator.generateFile(container, { install });
      
      expect(result).toContain('[Install]');
      expect(result).toContain('WantedBy=multi-user.target default.target');
    });

    it('should include GlobalArgs section when provided', () => {
      const globals = {
        podmanArgs: '--log-level=debug'
      };
      
      const result = QuadletGenerator.generateFile(container, { globals });
      
      expect(result).toContain('[GlobalArgs]');
      expect(result).toContain('PodmanArgs=--log-level=debug');
    });

    it('should generate complete file with all sections', () => {
      const options = {
        unit: { description: 'Test container' },
        service: { restart: 'always' },
        install: { wantedBy: ['multi-user.target'] },
        globals: { podmanArgs: '--log-level=debug' }
      };
      
      const result = QuadletGenerator.generateFile(container, options);
      
      expect(result).toContain('[Unit]');
      expect(result).toContain('[Container]');
      expect(result).toContain('[GlobalArgs]');
      expect(result).toContain('[Service]');
      expect(result).toContain('[Install]');
    });
  });

  describe('generateContainerSection', () => {
    it('should generate minimal container section with image only', () => {
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toBe('[Container]\nImage=nginx:latest\n');
    });

    it('should include container name when set', () => {
      container.setContainerName('my-nginx');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('ContainerName=my-nginx');
    });

    it('should include exec command when set', () => {
      container.setExec('/bin/bash -c "echo hello"');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Exec=/bin/bash -c "echo hello"');
    });

    it('should include published ports', () => {
      container.addPublishPort('8080:80');
      container.addPublishPort('9090:90');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('PublishPort=9090:90');
    });

    it('should include volumes', () => {
      container.addVolume('/data:/data:Z');
      container.addVolume('/logs:/logs:ro');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Volume=/data:/data:Z');
      expect(result).toContain('Volume=/logs:/logs:ro');
    });

    it('should include environment variables', () => {
      container.addEnvironment('NODE_ENV=production');
      container.addEnvironment('DEBUG=true');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Environment=NODE_ENV=production');
      expect(result).toContain('Environment=DEBUG=true');
    });

    it('should escape environment variables with spaces', () => {
      container.addEnvironment('MESSAGE=hello world');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Environment="MESSAGE=hello world"');
    });

    it('should include environment files', () => {
      container.environmentFile.push('/etc/myapp.env');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('EnvironmentFile=/etc/myapp.env');
    });

    it('should include environment host when enabled', () => {
      container.environmentHost = true;
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('EnvironmentHost=true');
    });

    it('should include labels', () => {
      container.addLabel('maintainer=john@example.com');
      container.addLabel('version=1.0');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Label=maintainer=john@example.com');
      expect(result).toContain('Label=version=1.0');
    });

    it('should escape labels with spaces', () => {
      container.addLabel('description=My awesome app');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Label="description=My awesome app"');
    });

    it('should include networks', () => {
      container.network.push('frontend');
      container.network.push('backend');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Network=frontend');
      expect(result).toContain('Network=backend');
    });

    it('should include network aliases', () => {
      container.networkAlias.push('web');
      container.networkAlias.push('api');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('NetworkAlias=web');
      expect(result).toContain('NetworkAlias=api');
    });

    it('should include capabilities', () => {
      container.addCapability.push('NET_ADMIN');
      container.addCapability.push('SYS_TIME');
      container.dropCapability.push('ALL');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('AddCapability=NET_ADMIN SYS_TIME');
      expect(result).toContain('DropCapability=ALL');
    });

    it('should include DNS configuration', () => {
      container.dns.push('8.8.8.8');
      container.dns.push('1.1.1.1');
      container.dnsOption.push('rotate');
      container.dnsSearch.push('example.com');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('DNS=8.8.8.8');
      expect(result).toContain('DNS=1.1.1.1');
      expect(result).toContain('DNSOption=rotate');
      expect(result).toContain('DNSSearch=example.com');
    });

    it('should handle DNS=none special case', () => {
      container.dns.push('none');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('DNS=none');
      expect(result).not.toContain('DNS=8.8.8.8'); // Should not include individual DNS entries
    });

    it('should include security options', () => {
      container.noNewPrivileges = true;
      container.securityLabelDisable = true;
      container.securityLabelFileType = 'container_file_t';
      container.securityLabelLevel = 's0:c123,c456';
      container.securityLabelNested = true;
      container.securityLabelType = 'container_t';
      container.seccompProfile = '/usr/share/containers/seccomp.json';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('NoNewPrivileges=true');
      expect(result).toContain('SecurityLabelDisable=true');
      expect(result).toContain('SecurityLabelFileType=container_file_t');
      expect(result).toContain('SecurityLabelLevel=s0:c123,c456');
      expect(result).toContain('SecurityLabelNested=true');
      expect(result).toContain('SecurityLabelType=container_t');
      expect(result).toContain('SeccompProfile=/usr/share/containers/seccomp.json');
    });

    it('should include mask and unmask', () => {
      container.mask.push('/proc/acpi');
      container.mask.push('/sys/firmware');
      container.unmask = ['ALL'];
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Mask=/proc/acpi:/sys/firmware');
      expect(result).toContain('Unmask=ALL');
    });

    it('should handle unmask as string', () => {
      container.unmask = 'ALL';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Unmask=ALL');
    });

    it('should include user and group settings', () => {
      container.user = '1000:1000';
      container.group = 'docker';
      container.groupAdd.push('wheel');
      container.groupAdd.push('audio');
      container.userNS = 'host';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('User=1000:1000');
      expect(result).toContain('Group=docker');
      expect(result).toContain('GroupAdd=wheel');
      expect(result).toContain('GroupAdd=audio');
      expect(result).toContain('UserNS=host');
    });

    it('should include UID/GID mappings', () => {
      container.uidMap.push('0:1000:1000');
      container.gidMap.push('0:1000:1000');
      container.subUidMap = '1000';
      container.subGidMap = '1000';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('UIDMap=0:1000:1000');
      expect(result).toContain('GIDMap=0:1000:1000');
      expect(result).toContain('SubUIDMap=1000');
      expect(result).toContain('SubGIDMap=1000');
    });

    it('should include runtime options', () => {
      container.readOnly = true;
      container.readOnlyTmpfs = false;
      container.runInit = true;
      container.workingDir = '/app';
      container.hostName = 'myhost';
      container.timezone = 'UTC';
      container.shmSize = '64m';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('ReadOnly=true');
      expect(result).toContain('ReadOnlyTmpfs=false');
      expect(result).toContain('RunInit=true');
      expect(result).toContain('WorkingDir=/app');
      expect(result).toContain('HostName=myhost');
      expect(result).toContain('Timezone=UTC');
      expect(result).toContain('ShmSize=64m');
    });

    it('should not include ReadOnlyTmpfs when true (default)', () => {
      // ReadOnlyTmpfs defaults to true, should not be included unless false
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).not.toContain('ReadOnlyTmpfs=true');
    });

    it('should include tmpfs mounts', () => {
      container.tmpfs.push('/tmp');
      container.tmpfs.push('/run:size=100m');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Tmpfs=/tmp');
      expect(result).toContain('Tmpfs=/run:size=100m');
    });

    it('should include health check configuration', () => {
      container.healthCmd = 'curl -f http://localhost/health';
      container.healthInterval = '30s';
      container.healthOnFailure = 'restart';
      container.healthRetries = 3;
      container.healthStartPeriod = '60s';
      container.healthTimeout = '10s';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('HealthCmd=curl -f http://localhost/health');
      expect(result).toContain('HealthInterval=30s');
      expect(result).toContain('HealthOnFailure=restart');
      expect(result).toContain('HealthRetries=3');
      expect(result).toContain('HealthStartPeriod=60s');
      expect(result).toContain('HealthTimeout=10s');
    });

    it('should include startup health check configuration', () => {
      container.healthStartupCmd = 'curl -f http://localhost/ready';
      container.healthStartupInterval = '10s';
      container.healthStartupRetries = 5;
      container.healthStartupSuccess = 1;
      container.healthStartupTimeout = '5s';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('HealthStartupCmd=curl -f http://localhost/ready');
      expect(result).toContain('HealthStartupInterval=10s');
      expect(result).toContain('HealthStartupRetries=5');
      expect(result).toContain('HealthStartupSuccess=1');
      expect(result).toContain('HealthStartupTimeout=5s');
    });

    it('should include systemd integration options', () => {
      container.notify = 'container';
      container.stopSignal = 'SIGTERM';
      container.stopTimeout = 30;
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Notify=true');
      expect(result).toContain('StopSignal=SIGTERM');
      expect(result).toContain('StopTimeout=30');
    });

    it('should handle notify=healthy special case', () => {
      container.notify = 'healthy';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Notify=healthy');
    });

    it('should not include notify when set to conmon (default)', () => {
      container.notify = 'conmon';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).not.toContain('Notify=');
    });

    it('should include pod reference', () => {
      container.setPod('mypod');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Pod=mypod');
    });

    it('should include logging configuration', () => {
      container.logDriver = 'journald';
      container.logOpt.push('tag=mycontainer');
      container.logOpt.push('max_size=10m');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('LogDriver=journald');
      expect(result).toContain('LogOpt=tag=mycontainer');
      expect(result).toContain('LogOpt=max_size=10m');
    });

    it('should include annotations', () => {
      container.annotation.push('io.kubernetes.cri-o.TTY=true');
      container.annotation.push('description=My test container');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Annotation=io.kubernetes.cri-o.TTY=true');
      expect(result).toContain('Annotation="description=My test container"');
    });

    it('should include resource limits', () => {
      container.pidsLimit = 100;
      container.ulimit.push('nofile=1024:2048');
      container.sysctl.push('net.core.somaxconn=1024');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('PidsLimit=100');
      expect(result).toContain('Ulimit=nofile=1024:2048');
      expect(result).toContain('Sysctl=net.core.somaxconn=1024');
    });

    it('should include auto update and pull policy', () => {
      container.autoUpdate = 'registry';
      container.pull = 'always';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('AutoUpdate=registry');
      expect(result).toContain('Pull=always');
    });

    it('should include secrets', () => {
      container.secret.push('mysecret');
      container.secret.push('anothersecret,type=mount');
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Secret=mysecret');
      expect(result).toContain('Secret=anothersecret,type=mount');
    });

    it('should include rootfs and entrypoint', () => {
      container.rootfs = '/path/to/rootfs';
      container.entrypoint = '/custom/entrypoint.sh';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('Rootfs=/path/to/rootfs');
      expect(result).toContain('Entrypoint=/custom/entrypoint.sh');
    });

    it('should include IP addresses', () => {
      container.ip = '192.168.1.100';
      container.ip6 = '2001:db8::1';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('IP=192.168.1.100');
      expect(result).toContain('IP6=2001:db8::1');
    });

    it('should include additional podman arguments', () => {
      container.podmanArgs = '--privileged --cap-add=SYS_ADMIN';
      
      const result = QuadletGenerator.generateContainerSection(container);
      
      expect(result).toContain('PodmanArgs=--privileged --cap-add=SYS_ADMIN');
    });
  });

  describe('generateUnitSection', () => {
    it('should generate empty unit section when no properties', () => {
      const result = QuadletGenerator.generateUnitSection({});
      
      expect(result).toBe('[Unit]\n');
    });

    it('should include description', () => {
      const unit = { description: 'My test service' };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('Description=My test service');
    });

    it('should include wants dependencies', () => {
      const unit = { wants: ['network.target', 'docker.service'] };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('Wants=network.target docker.service');
    });

    it('should include requires dependencies', () => {
      const unit = { requires: ['network.target'] };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('Requires=network.target');
    });

    it('should include after dependencies', () => {
      const unit = { after: ['network.target', 'docker.service'] };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('After=network.target docker.service');
    });

    it('should include before dependencies', () => {
      const unit = { before: ['myapp.service'] };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('Before=myapp.service');
    });

    it('should handle all unit properties together', () => {
      const unit = {
        description: 'Complete unit',
        wants: ['network.target'],
        requires: ['docker.service'],
        after: ['network.target', 'docker.service'],
        before: ['myapp.service']
      };
      
      const result = QuadletGenerator.generateUnitSection(unit);
      
      expect(result).toContain('Description=Complete unit');
      expect(result).toContain('Wants=network.target');
      expect(result).toContain('Requires=docker.service');
      expect(result).toContain('After=network.target docker.service');
      expect(result).toContain('Before=myapp.service');
    });
  });

  describe('generateServiceSection', () => {
    it('should generate empty service section when no properties', () => {
      const result = QuadletGenerator.generateServiceSection({});
      
      expect(result).toBe('[Service]\n');
    });

    it('should include restart policy', () => {
      const service = { restart: 'always' };
      
      const result = QuadletGenerator.generateServiceSection(service);
      
      expect(result).toContain('Restart=always');
    });

    it('should include restart delay', () => {
      const service = { restartSec: '30' };
      
      const result = QuadletGenerator.generateServiceSection(service);
      
      expect(result).toContain('RestartSec=30');
    });

    it('should include both restart options', () => {
      const service = { restart: 'on-failure', restartSec: '10' };
      
      const result = QuadletGenerator.generateServiceSection(service);
      
      expect(result).toContain('Restart=on-failure');
      expect(result).toContain('RestartSec=10');
    });
  });

  describe('generateInstallSection', () => {
    it('should generate empty install section when no properties', () => {
      const result = QuadletGenerator.generateInstallSection({});
      
      expect(result).toBe('[Install]\n');
    });

    it('should include wanted by targets', () => {
      const install = { wantedBy: ['multi-user.target', 'default.target'] };
      
      const result = QuadletGenerator.generateInstallSection(install);
      
      expect(result).toContain('WantedBy=multi-user.target default.target');
    });

    it('should include required by targets', () => {
      const install = { requiredBy: ['myapp.target'] };
      
      const result = QuadletGenerator.generateInstallSection(install);
      
      expect(result).toContain('RequiredBy=myapp.target');
    });

    it('should include both wanted and required by', () => {
      const install = {
        wantedBy: ['multi-user.target'],
        requiredBy: ['myapp.target']
      };
      
      const result = QuadletGenerator.generateInstallSection(install);
      
      expect(result).toContain('WantedBy=multi-user.target');
      expect(result).toContain('RequiredBy=myapp.target');
    });
  });

  describe('escapeValue', () => {
    it('should return unchanged value when no spaces', () => {
      const result = QuadletGenerator.escapeValue('simple_value');
      
      expect(result).toBe('simple_value');
    });

    it('should wrap in quotes when value contains spaces', () => {
      const result = QuadletGenerator.escapeValue('value with spaces');
      
      expect(result).toBe('"value with spaces"');
    });

    it('should escape internal quotes', () => {
      const result = QuadletGenerator.escapeValue('value with "quotes"');
      
      expect(result).toBe('"value with \\"quotes\\""');
    });

    it('should handle non-string values', () => {
      const result = QuadletGenerator.escapeValue(123);
      
      expect(result).toBe(123);
    });

    it('should handle null values', () => {
      const result = QuadletGenerator.escapeValue(null);
      
      expect(result).toBe(null);
    });

    it('should handle undefined values', () => {
      const result = QuadletGenerator.escapeValue(undefined);
      
      expect(result).toBe(undefined);
    });
  });

  describe('integration tests', () => {
    it('should generate a realistic web server quadlet', () => {
      const webContainer = new Container();
      webContainer.setImage('nginx:alpine');
      webContainer.setContainerName('web-server');
      webContainer.addPublishPort('8080:80');
      webContainer.addVolume('/var/www/html:/usr/share/nginx/html:ro');
      webContainer.addEnvironment('NGINX_HOST=example.com');
      webContainer.addLabel('service=web');

      const options = {
        unit: {
          description: 'Web Server Container',
          after: ['network.target']
        },
        service: {
          restart: 'always'
        },
        install: {
          wantedBy: ['multi-user.target']
        }
      };

      const result = QuadletGenerator.generateFile(webContainer, options);

      expect(result).toContain('[Unit]');
      expect(result).toContain('Description=Web Server Container');
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=web-server');
      expect(result).toContain('PublishPort=8080:80');
      expect(result).toContain('[Service]');
      expect(result).toContain('Restart=always');
      expect(result).toContain('[Install]');
      expect(result).toContain('WantedBy=multi-user.target');
    });

    it('should generate a database container quadlet with security options', () => {
      const dbContainer = new Container();
      dbContainer.setImage('postgres:13');
      dbContainer.setContainerName('postgres-db');
      dbContainer.addEnvironment('POSTGRES_DB=myapp');
      dbContainer.addEnvironment('POSTGRES_USER=dbuser');
      dbContainer.addEnvironment('POSTGRES_PASSWORD=secret123');
      dbContainer.addVolume('/var/lib/postgresql/data:/var/lib/postgresql/data:Z');
      dbContainer.user = '999:999';
      dbContainer.noNewPrivileges = true;
      dbContainer.dropCapability.push('ALL');
      dbContainer.addCapability.push('SETGID');
      dbContainer.addCapability.push('SETUID');

      const result = QuadletGenerator.generateContainerSection(dbContainer);

      expect(result).toContain('Image=postgres:13');
      expect(result).toContain('Environment=POSTGRES_DB=myapp');
      expect(result).toContain('User=999:999');
      expect(result).toContain('NoNewPrivileges=true');
      expect(result).toContain('DropCapability=ALL');
      expect(result).toContain('AddCapability=SETGID SETUID');
    });
  });
});
