import { describe, it, expect, beforeEach } from '@jest/globals';
import PodletJS, { createPodlet } from '../../src/index.js';
import { Container } from '../../src/container.js';
import { QuadletGenerator } from '../../src/quadlet-generator.js';
import { ComposeParser } from '../../src/compose-parser.js';

// Note: These tests use integration-style testing rather than mocking
// due to ES module compatibility considerations

describe('PodletJS', () => {
  let podlet;

  beforeEach(() => {
    podlet = new PodletJS();
  });

  describe('constructor', () => {
    it('should create new instances of dependencies', () => {
      expect(podlet.composeParser).toBeInstanceOf(ComposeParser);
      expect(podlet.quadletGenerator).toBeInstanceOf(QuadletGenerator);
    });
  });

  describe('dockerRunToQuadlet', () => {
    it('should parse docker run command and generate quadlet file', () => {
      const dockerCommand = 'docker run -d --name test-app -p 8080:80 nginx:alpine';
      
      const result = podlet.dockerRunToQuadlet(dockerCommand);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=test-app');
      expect(result).toContain('PublishPort=8080:80');
    });

    it('should pass options to quadlet generator', () => {
      const dockerCommand = 'docker run -d --name test-app nginx:alpine';
      const options = {
        unit: { Description: 'Test app' },
        service: { Restart: 'always' }
      };
      
      const result = podlet.dockerRunToQuadlet(dockerCommand, options);
      
      expect(result).toContain('[Unit]');
      expect(result).toContain('Description=Test app');
      expect(result).toContain('[Service]');
      expect(result).toContain('Restart=always');
    });

    it('should handle array command format', () => {
      const dockerCommand = ['docker', 'run', '-d', '--name', 'test-app', 'nginx:alpine'];
      
      const result = podlet.dockerRunToQuadlet(dockerCommand);
      
      expect(result).toBeDefined();
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=test-app');
    });
  });

  describe('composeToQuadlet', () => {
    it('should parse compose file and generate quadlet files for each service', () => {
      const composeYaml = `
version: '3'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: secret
`;
      
      const results = podlet.composeToQuadlet(composeYaml);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      
      const webResult = results.find(r => r.filename.includes('web'));
      const dbResult = results.find(r => r.filename.includes('db'));
      
      expect(webResult).toBeDefined();
      expect(webResult.content).toContain('Image=nginx:alpine');
      expect(webResult.content).toContain('PublishPort=80:80');
      
      expect(dbResult).toBeDefined();
      expect(dbResult.content).toContain('Image=postgres:13');
      expect(dbResult.content).toContain('Environment=POSTGRES_PASSWORD=secret');
    });

    it('should handle service dependencies by adding unit configuration', () => {
      const composeYaml = `
version: '3'
services:
  app:
    image: nginx:alpine
    depends_on:
      - db
  db:
    image: postgres:13
`;
      
      const results = podlet.composeToQuadlet(composeYaml);
      
      const appResult = results.find(r => r.filename.includes('app'));
      expect(appResult.content).toContain('[Unit]');
      expect(appResult.content).toContain('After=db.service');
      expect(appResult.content).toContain('Wants=db.service');
    });

    it('should handle restart policies by adding service configuration', () => {
      const composeYaml = `
version: '3'
services:
  app:
    image: nginx:alpine
    restart: always
`;
      
      const results = podlet.composeToQuadlet(composeYaml);
      
      const appResult = results[0];
      expect(appResult.content).toContain('[Service]');
      expect(appResult.content).toContain('Restart=always');
    });

    it('should map different restart policy values correctly', () => {
      const testCases = [
        { compose: 'no', expected: 'no' },
        { compose: 'always', expected: 'always' },
        { compose: 'on-failure', expected: 'on-failure' },
        { compose: 'unless-stopped', expected: 'unless-stopped' }
      ];

      testCases.forEach(({ compose, expected }) => {
        const composeYaml = `
version: '3'
services:
  app:
    image: nginx:alpine
    restart: ${compose}
`;
        
        const results = podlet.composeToQuadlet(composeYaml);
        const appResult = results[0];
        expect(appResult.content).toContain(`Restart=${expected}`);
      });
    });

    it('should preserve existing unit and service options', () => {
      const composeYaml = `
version: '3'
services:
  app:
    image: nginx:alpine
    restart: always
    depends_on:
      - db
  db:
    image: postgres:13
`;
      
      const options = {
        unit: { Description: 'Custom app' },
        service: { TimeoutStartSec: '60' }
      };
      
      const results = podlet.composeToQuadlet(composeYaml, options);
      
      const appResult = results.find(r => r.filename.includes('app'));
      expect(appResult.content).toContain('Description=Custom app');
      expect(appResult.content).toContain('TimeoutStartSec=60');
      expect(appResult.content).toContain('Restart=always');
      expect(appResult.content).toContain('After=db.service');
    });
  });

  describe('containerToQuadlet', () => {
    it('should validate, normalize and generate quadlet for container', () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      container.setContainerName('test-app');
      container.addPublishPort('80:80');
      
      const result = podlet.containerToQuadlet(container);
      
      expect(result).toBeDefined();
      expect(result).toContain('[Container]');
      expect(result).toContain('Image=nginx:alpine');
      expect(result).toContain('ContainerName=test-app');
      expect(result).toContain('PublishPort=80:80');
    });

    it('should throw error if container validation fails', () => {
      const container = new Container();
      // Container without image should fail validation
      
      expect(() => {
        podlet.containerToQuadlet(container);
      }).toThrow('Image is required');
    });

    it('should pass options to quadlet generator', () => {
      const container = new Container();
      container.setImage('nginx:alpine');
      
      const options = {
        unit: { Description: 'Test container' },
        service: { Restart: 'always' }
      };
      
      const result = podlet.containerToQuadlet(container, options);
      
      expect(result).toContain('[Unit]');
      expect(result).toContain('Description=Test container');
      expect(result).toContain('[Service]');
      expect(result).toContain('Restart=always');
    });
  });

  describe('parseDockerRun', () => {
    it('should delegate to composerize', () => {
      const dockerCommand = 'docker run -d --name test nginx:alpine';
      
      const result = podlet.parseDockerRun(dockerCommand);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.services).toBeDefined();
      expect(result.services.nginx).toBeDefined();
      expect(result.services.nginx.image).toBe('nginx:alpine');
    });
  });

  describe('parseCompose', () => {
    it('should delegate to compose parser', () => {
      const composeYaml = `
version: '3'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
`;
      
      const result = podlet.parseCompose(composeYaml);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].image).toBe('nginx:alpine');
      expect(result[0].publishPort).toContain('80:80');
    });
  });
});

describe('createPodlet', () => {
  it('should return a new PodletJS instance', () => {
    const podlet = createPodlet();
    expect(podlet).toBeInstanceOf(PodletJS);
  });

  it('should create independent instances', () => {
    const podlet1 = createPodlet();
    const podlet2 = createPodlet();
    
    expect(podlet1).toBeInstanceOf(PodletJS);
    expect(podlet2).toBeInstanceOf(PodletJS);
    
    // They should be different instances
    expect(podlet1).not.toBe(podlet2);
    expect(podlet1.composeParser).not.toBe(podlet2.composeParser);
    expect(podlet1.quadletGenerator).not.toBe(podlet2.quadletGenerator);
  });
});
