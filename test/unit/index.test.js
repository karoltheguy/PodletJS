import PodletJS, { createPodlet } from '../../src/index.js';
import { Container } from '../../src/container.js';
import { QuadletGenerator } from '../../src/quadlet-generator.js';
import { ComposeParser } from '../../src/compose-parser.js';
import { ContainerUtils } from '../../src/types.js';
const composerize = require('composerize');

// Mock external dependencies
jest.mock('../../src/quadlet-generator.js');
jest.mock('../../src/compose-parser.js');
jest.mock('../../src/types.js');
jest.mock('composerize');

describe('PodletJS', () => {
  let podlet;
  let mockComposeParser;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock instances
    mockComposeParser = {
      parse: jest.fn()
    };
    
    // Mock constructors
    ComposeParser.mockImplementation(() => mockComposeParser);
    QuadletGenerator.generateFile = jest.fn();
    
    // Mock static methods
    ContainerUtils.validateContainer = jest.fn().mockReturnValue([]);
    ContainerUtils.normalizeContainer = jest.fn();
    
    // Mock composerize function
    composerize.mockImplementation(() => new Container());
    
    podlet = new PodletJS();
  });

  describe('constructor', () => {
    it('should create new instances of dependencies', () => {
      expect(ComposeParser).toHaveBeenCalled();
      expect(podlet.composeParser).toBeDefined();
    });
  });

  describe('dockerRunToQuadlet', () => {
    it('should parse docker run command and generate quadlet file', () => {
      const command = 'docker run -d --name test nginx:latest';
      const mockContainer = new Container();
      const expectedQuadlet = '[Container]\nImage=nginx:latest\n';
      
      composerize.mockReturnValue(mockContainer);
      QuadletGenerator.generateFile.mockReturnValue(expectedQuadlet);
      
      const result = podlet.dockerRunToQuadlet(command);
      
      expect(composerize).toHaveBeenCalledWith(command);
      expect(QuadletGenerator.generateFile).toHaveBeenCalledWith(mockContainer, {});
      expect(result).toBe(expectedQuadlet);
    });

    it('should pass options to quadlet generator', () => {
      const command = 'docker run nginx:latest';
      const options = { name: 'custom-name' };
      const mockContainer = new Container();
      
      composerize.mockReturnValue(mockContainer);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      podlet.dockerRunToQuadlet(command, options);
      
      expect(composerize).toHaveBeenCalledWith(command);
      expect(QuadletGenerator.generateFile).toHaveBeenCalledWith(mockContainer, options);
    });

    it('should handle array command format', () => {
      const command = ['docker', 'run', '-d', 'nginx:latest'];
      const mockContainer = new Container();
      
      composerize.mockReturnValue(mockContainer);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      podlet.dockerRunToQuadlet(command);
      
      expect(composerize).toHaveBeenCalledWith(command);
    });
  });

  describe('composeToQuadlet', () => {
    it('should parse compose file and generate quadlet files for each service', () => {
      const yamlContent = `
        version: '3'
        services:
          web:
            image: nginx:latest
          db:
            image: postgres:13
      `;
      
      const mockServices = {
        web: new Container(),
        db: new Container()
      };
      
      mockComposeParser.parse.mockReturnValue(mockServices);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      const result = podlet.composeToQuadlet(yamlContent);
      
      expect(mockComposeParser.parse).toHaveBeenCalledWith(yamlContent);
      expect(QuadletGenerator.generateFile).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        web: 'quadlet content',
        db: 'quadlet content'
      });
    });

    it('should handle service dependencies by adding unit configuration', () => {
      const yamlContent = 'compose content';
      const webContainer = new Container();
      webContainer._dependsOn = ['db'];
      
      const mockServices = {
        web: webContainer,
        db: new Container()
      };
      
      mockComposeParser.parse.mockReturnValue(mockServices);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      const result = podlet.composeToQuadlet(yamlContent);
      
      // Check that web service was called with dependency configuration
      const webCall = QuadletGenerator.generateFile.mock.calls.find(
        call => call[1].name === 'web'
      );
      
      expect(webCall[1].unit).toEqual({
        after: ['db.service'],
        wants: ['db.service']
      });
    });

    it('should handle restart policies by adding service configuration', () => {
      const yamlContent = 'compose content';
      const webContainer = new Container();
      webContainer._restart = 'always';
      
      const mockServices = {
        web: webContainer
      };
      
      mockComposeParser.parse.mockReturnValue(mockServices);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      podlet.composeToQuadlet(yamlContent);
      
      const webCall = QuadletGenerator.generateFile.mock.calls[0];
      expect(webCall[1].service).toEqual({ restart: 'always' });
    });

    it('should map different restart policy values correctly', () => {
      const testCases = [
        { input: 'no', expected: undefined },
        { input: 'always', expected: 'always' },
        { input: 'on-failure', expected: 'on-failure' },
        { input: 'unless-stopped', expected: 'always' }
      ];

      testCases.forEach(({ input, expected }) => {
        const container = new Container();
        container._restart = input;
        
        const mockServices = { test: container };
        mockComposeParser.parse.mockReturnValue(mockServices);
        QuadletGenerator.generateFile.mockClear();
        
        podlet.composeToQuadlet('yaml content');
        
        const call = QuadletGenerator.generateFile.mock.calls[0];
        if (expected) {
          expect(call[1].service).toEqual({ restart: expected });
        } else {
          expect(call[1].service).toBeUndefined();
        }
      });
    });

    it('should preserve existing unit and service options', () => {
      const yamlContent = 'compose content';
      const options = {
        unit: { description: 'Custom description' },
        service: { type: 'oneshot' }
      };
      
      const container = new Container();
      container._dependsOn = ['db'];
      container._restart = 'always';
      
      const mockServices = { web: container };
      mockComposeParser.parse.mockReturnValue(mockServices);
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      podlet.composeToQuadlet(yamlContent, options);
      
      const call = QuadletGenerator.generateFile.mock.calls[0];
      expect(call[1].unit).toEqual({
        description: 'Custom description',
        after: ['db.service'],
        wants: ['db.service']
      });
      expect(call[1].service).toEqual({
        type: 'oneshot',
        restart: 'always'
      });
    });
  });

  describe('containerToQuadlet', () => {
    let mockContainer;

    beforeEach(() => {
      mockContainer = new Container();
    });

    it('should validate, normalize and generate quadlet for container', () => {
      const expectedQuadlet = '[Container]\nImage=nginx:latest\n';
      QuadletGenerator.generateFile.mockReturnValue(expectedQuadlet);
      
      const result = podlet.containerToQuadlet(mockContainer);
      
      expect(ContainerUtils.validateContainer).toHaveBeenCalledWith(mockContainer);
      expect(ContainerUtils.normalizeContainer).toHaveBeenCalledWith(mockContainer);
      expect(QuadletGenerator.generateFile).toHaveBeenCalledWith(mockContainer, {});
      expect(result).toBe(expectedQuadlet);
    });

    it('should throw error if container validation fails', () => {
      const validationErrors = ['Image is required', 'Invalid port format'];
      ContainerUtils.validateContainer.mockReturnValue(validationErrors);
      
      expect(() => {
        podlet.containerToQuadlet(mockContainer);
      }).toThrow('Container validation failed: Image is required, Invalid port format');
      
      expect(QuadletGenerator.generateFile).not.toHaveBeenCalled();
    });

    it('should pass options to quadlet generator', () => {
      const options = { name: 'test-container' };
      QuadletGenerator.generateFile.mockReturnValue('quadlet content');
      
      podlet.containerToQuadlet(mockContainer, options);
      
      expect(QuadletGenerator.generateFile).toHaveBeenCalledWith(mockContainer, options);
    });
  });

  describe('parseDockerRun', () => {
    it('should delegate to composerize', () => {
      const command = 'docker run nginx:latest';
      const expectedContainer = new Container();
      
      composerize.mockReturnValue(expectedContainer);
      
      const result = podlet.parseDockerRun(command);
      
      expect(composerize).toHaveBeenCalledWith(command);
      expect(result).toBe(expectedContainer);
    });
  });

  describe('parseCompose', () => {
    it('should delegate to compose parser', () => {
      const yamlContent = 'version: "3"\nservices:\n  web:\n    image: nginx';
      const expectedServices = { web: new Container() };
      
      mockComposeParser.parse.mockReturnValue(expectedServices);
      
      const result = podlet.parseCompose(yamlContent);
      
      expect(mockComposeParser.parse).toHaveBeenCalledWith(yamlContent);
      expect(result).toBe(expectedServices);
    });
  });
});

describe('createPodlet', () => {
  it('should return a new PodletJS instance', () => {
    const podlet = createPodlet();
    
    expect(podlet).toBeInstanceOf(PodletJS);
    expect(podlet.composeParser).toBeDefined();
  });

  it('should create independent instances', () => {
    const podlet1 = createPodlet();
    const podlet2 = createPodlet();
    
    expect(podlet1).not.toBe(podlet2);
    expect(podlet1).toBeInstanceOf(PodletJS);
    expect(podlet2).toBeInstanceOf(PodletJS);

    expect(ComposeParser).toHaveBeenCalledTimes(4); // 2 in beforeEach, 2 here
  });
});
