/**
 * PodletJS - JavaScript port of Podlet
 * Generate Podman Quadlet files from Docker run commands and compose files
 */

import { Container } from './container.js';
import { QuadletGenerator } from './quadlet-generator.js';
import { ComposeParser } from './compose-parser.js';
import { 
  Unit, Service, Install, Globals, 
  Volume, PortMapping, Environment, Label,
  ContainerUtils, NotifyOptions, PullPolicy, AutoUpdate, RestartPolicy
} from './types.js';
const composerize = require('composerize');

/**
 * Main PodletJS class - entry point for all transformations
 */
export class PodletJS {
  constructor() {
    //this.composerize = new Composerize();
    this.composeParser = new ComposeParser();
  }

  /**
   * Parse a docker run command and generate a Quadlet file
   * 
   * @param {string|Array} command - Docker run command as string or array of arguments
   * @param {Object} options - Additional options for generation
   * @returns {string} Generated Quadlet file content
   */
  dockerRunToQuadlet(command, options = {}) {
    const container = this.parseDockerRun(command);
    return this.containerToQuadlet(container, options);
  }

  /**
   * Parse a compose file and generate Quadlet files
   * 
   * @param {string} yamlContent - Compose file YAML content
   * @param {Object} options - Additional options for generation
   * @returns {Object} Map of service names to Quadlet file content
   */
  composeToQuadlet(yamlContent, options = {}) {
    const services = this.parseCompose(yamlContent);
    const results = {};
    
    for (const [serviceName, container] of Object.entries(services)) {
      // Handle dependencies through systemd Unit configuration
      let unitConfig = options.unit || {};
      
      if (container._dependsOn && container._dependsOn.length > 0) {
        unitConfig = {
          ...unitConfig,
          after: [...(unitConfig.after || []), ...container._dependsOn.map(dep => `${dep}.service`)],
          wants: [...(unitConfig.wants || []), ...container._dependsOn.map(dep => `${dep}.service`)]
        };
      }

      // Handle restart policy through Service configuration
      let serviceConfig = options.service || {};
      if (container._restart) {
        const restartMap = {
          'no': undefined,
          'always': 'always',
          'on-failure': 'on-failure',
          'unless-stopped': 'always'
        };
        const restart = restartMap[container._restart];
        if (restart) {
          serviceConfig = { ...serviceConfig, restart };
        }
      }

      results[serviceName] = this.containerToQuadlet(container, {
        ...options,
        name: serviceName,
        unit: Object.keys(unitConfig).length > 0 ? unitConfig : options.unit,
        service: Object.keys(serviceConfig).length > 0 ? serviceConfig : options.service
      });
    }
    
    return results;
  }

  /**
   * Convert a Container object to Quadlet file content
   * 
   * @param {Container} container - Container configuration
   * @param {Object} options - Generation options
   * @returns {string} Generated Quadlet file content
   */
  containerToQuadlet(container, options = {}) {
    // Validate container
    const errors = ContainerUtils.validateContainer(container);
    if (errors.length > 0) {
      throw new Error(`Container validation failed: ${errors.join(', ')}`);
    }

    // Normalize container
    ContainerUtils.normalizeContainer(container);

    // Generate Quadlet file
    return QuadletGenerator.generateFile(container, options);
  }

  /**
   * Parse a docker run command into a Container object
   * 
   * @param {string|Array} command - Docker run command
   * @returns {Container} Parsed container configuration
   */
  parseDockerRun(command) {
    return composerize(command);
  }

  /**
   * Parse a compose file into Container objects
   * 
   * @param {string} yamlContent - Compose YAML content
   * @returns {Object} Map of service names to Container objects
   */
  parseCompose(yamlContent) {
    return this.composeParser.parse(yamlContent);
  }

}

/**
 * Convenience function to create a new PodletJS instance
 */
export function createPodlet() {
  return new PodletJS();
}

// Export all classes and types for direct use
export {
  Container,
  QuadletGenerator,
  ComposeParser,
  Unit,
  Service, 
  Install,
  Globals,
  Volume,
  PortMapping,
  Environment,
  Label,
  ContainerUtils,
  NotifyOptions,
  PullPolicy,
  AutoUpdate,
  RestartPolicy
};

// Default export
export default PodletJS;