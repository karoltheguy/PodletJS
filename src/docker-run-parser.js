/**
 * Docker Run Command Parser
 * Parses docker/podman run commands into Container configurations
 * Based on the Rust implementation from podlet
 */

import { Container } from './container.js';
import { Volume, PortMapping, Environment, Label, Device } from './types.js';

/**
 * Main parser class for docker run commands
 */
export class DockerRunParser {
  constructor() {
    // Flag mappings from docker/podman run to Container properties
    this.flagMappings = this._initializeFlagMappings();
  }

  /**
   * Parse a docker run command into a Container object
   */
  parse(command) {
    const args = this._tokenizeCommand(command);
    const container = new Container();
    
    // Remove 'docker'/'podman' and 'run' from the beginning
    let i = 0;
    if (args[i] === 'docker' || args[i] === 'podman') i++;
    if (args[i] === 'run') i++;

    // Parse flags and arguments
    while (i < args.length) {
      const arg = args[i];
      
      if (!arg.startsWith('-')) {
        // This should be the image name
        container.setImage(arg);
        i++;
        
        // Everything after the image is the command
        if (i < args.length) {
          const command = args.slice(i).join(' ');
          container.setExec(command);
        }
        break;
      }

      // Handle flags
      const result = this._parseFlag(arg, args, i, container);
      i = result.nextIndex;
    }

    return container;
  }

  /**
   * Parse a single flag and its arguments
   */
  _parseFlag(flag, args, startIndex, container) {
    // Handle both --flag and -f formats
    const cleanFlag = flag.replace(/^-+/, '');
    const mapping = this.flagMappings[cleanFlag];
    
    if (!mapping) {
      // Unknown flag - add to podmanArgs
      return this._handleUnknownFlag(flag, args, startIndex, container);
    }

    return mapping.handler(args, startIndex, container);
  }

  /**
   * Handle unknown flags by adding them to podmanArgs
   */
  _handleUnknownFlag(flag, args, startIndex, container) {
    let podmanArgs = container.podmanArgs || '';
    if (podmanArgs) podmanArgs += ' ';
    
    podmanArgs += flag;
    
    let nextIndex = startIndex + 1;
    
    // Check if the next argument is a value (not another flag)
    if (nextIndex < args.length && !args[nextIndex].startsWith('-')) {
      podmanArgs += ' ' + this._escapeArg(args[nextIndex]);
      nextIndex++;
    }
    
    container.podmanArgs = podmanArgs;
    return { nextIndex };
  }

  /**
   * Initialize flag mappings
   */
  _initializeFlagMappings() {
    return {
      // Container name
      'name': {
        handler: (args, i, container) => {
          container.setContainerName(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Port publishing
      'p': this._createPortHandler(),
      'publish': this._createPortHandler(),

      // Volume mounts
      'v': this._createVolumeHandler(),
      'volume': this._createVolumeHandler(),

      // Environment variables
      'e': this._createEnvHandler(),
      'env': this._createEnvHandler(),
      'environment': this._createEnvHandler(),

      // Environment files
      'env-file': {
        handler: (args, i, container) => {
          container.environmentFile.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Labels
      'l': this._createLabelHandler(),
      'label': this._createLabelHandler(),

      // Networks
      'network': {
        handler: (args, i, container) => {
          container.network.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Working directory
      'w': {
        handler: (args, i, container) => {
          container.workingDir = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },
      'workdir': {
        handler: (args, i, container) => {
          container.workingDir = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // User
      'u': this._createUserHandler(),
      'user': this._createUserHandler(),

      // Hostname
      'h': {
        handler: (args, i, container) => {
          container.hostName = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },
      'hostname': {
        handler: (args, i, container) => {
          container.hostName = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // Entrypoint
      'entrypoint': {
        handler: (args, i, container) => {
          container.entrypoint = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // Devices
      'device': {
        handler: (args, i, container) => {
          const device = Device.parse(args[i + 1]);
          container.addDevice.push(device.toString());
          return { nextIndex: i + 2 };
        }
      },

      // Capabilities
      'cap-add': {
        handler: (args, i, container) => {
          container.addCapability.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },
      'cap-drop': {
        handler: (args, i, container) => {
          container.dropCapability.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // DNS
      'dns': {
        handler: (args, i, container) => {
          container.dns.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Security options
      'security-opt': {
        handler: (args, i, container) => {
          const opt = args[i + 1];
          if (opt === 'no-new-privileges:true') {
            container.noNewPrivileges = true;
          } else if (opt.startsWith('label=disable')) {
            container.securityLabelDisable = true;
          } else if (opt.startsWith('seccomp=')) {
            container.seccompProfile = opt.substring(8);
          } else {
            // Add to podmanArgs for other security options
            this._addToPodmanArgs(container, '--security-opt', opt);
          }
          return { nextIndex: i + 2 };
        }
      },

      // Read-only
      'read-only': {
        handler: (args, i, container) => {
          container.readOnly = true;
          return { nextIndex: i + 1 };
        }
      },

      // TTY
      't': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '-t');
          return { nextIndex: i + 1 };
        }
      },
      'tty': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '--tty');
          return { nextIndex: i + 1 };
        }
      },

      // Interactive
      'i': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '-i');
          return { nextIndex: i + 1 };
        }
      },
      'interactive': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '--interactive');
          return { nextIndex: i + 1 };
        }
      },

      // Detach (ignored - always detached in systemd)
      'd': {
        handler: (args, i, container) => {
          return { nextIndex: i + 1 };
        }
      },
      'detach': {
        handler: (args, i, container) => {
          return { nextIndex: i + 1 };
        }
      },

      // Remove (ignored - handled by systemd)
      'rm': {
        handler: (args, i, container) => {
          return { nextIndex: i + 1 };
        }
      },

      // Restart policy
      'restart': {
        handler: (args, i, container) => {
          // This will be handled in the [Service] section
          return { nextIndex: i + 2 };
        }
      },

      // Memory limit
      'm': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '-m', args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },
      'memory': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '--memory', args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // CPU limits
      'cpus': {
        handler: (args, i, container) => {
          this._addToPodmanArgs(container, '--cpus', args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Pull policy
      'pull': {
        handler: (args, i, container) => {
          container.pull = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // Stop signal
      'stop-signal': {
        handler: (args, i, container) => {
          container.stopSignal = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // Stop timeout
      'stop-timeout': {
        handler: (args, i, container) => {
          container.stopTimeout = parseInt(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Health check
      'health-cmd': {
        handler: (args, i, container) => {
          container.healthCmd = args[i + 1];
          return { nextIndex: i + 2 };
        }
      },

      // Tmpfs
      'tmpfs': {
        handler: (args, i, container) => {
          container.tmpfs.push(args[i + 1]);
          return { nextIndex: i + 2 };
        }
      },

      // Init
      'init': {
        handler: (args, i, container) => {
          container.runInit = true;
          return { nextIndex: i + 1 };
        }
      }
    };
  }

  /**
   * Create port handler for -p/--publish flags
   */
  _createPortHandler() {
    return {
      handler: (args, i, container) => {
        const portSpec = args[i + 1];
        container.addPublishPort(portSpec);
        return { nextIndex: i + 2 };
      }
    };
  }

  /**
   * Create volume handler for -v/--volume flags
   */
  _createVolumeHandler() {
    return {
      handler: (args, i, container) => {
        const volumeSpec = args[i + 1];
        container.addVolume(volumeSpec);
        return { nextIndex: i + 2 };
      }
    };
  }

  /**
   * Create environment handler for -e/--env flags
   */
  _createEnvHandler() {
    return {
      handler: (args, i, container) => {
        const envSpec = args[i + 1];
        container.addEnvironment(envSpec);
        return { nextIndex: i + 2 };
      }
    };
  }

  /**
   * Create label handler for -l/--label flags
   */
  _createLabelHandler() {
    return {
      handler: (args, i, container) => {
        const labelSpec = args[i + 1];
        container.addLabel(labelSpec);
        return { nextIndex: i + 2 };
      }
    };
  }

  /**
   * Create user handler for -u/--user flags
   */
  _createUserHandler() {
    return {
      handler: (args, i, container) => {
        const userSpec = args[i + 1];
        if (userSpec.includes(':')) {
          const [user, group] = userSpec.split(':');
          container.user = user;
          container.group = group;
        } else {
          container.user = userSpec;
        }
        return { nextIndex: i + 2 };
      }
    };
  }

  /**
   * Add arguments to podmanArgs field
   */
  _addToPodmanArgs(container, flag, value = null) {
    let args = container.podmanArgs || '';
    if (args) args += ' ';
    
    args += flag;
    if (value !== null) {
      args += ' ' + this._escapeArg(value);
    }
    
    container.podmanArgs = args;
  }

  /**
   * Escape argument for shell safety
   */
  _escapeArg(arg) {
    if (typeof arg !== 'string') {
      arg = String(arg);
    }
    
    // If the argument contains spaces or special characters, quote it
    if (/[\s"'`$\\|&;()<>]/.test(arg)) {
      return `"${arg.replace(/["\\]/g, '\\$&')}"`;
    }
    return arg;
  }

  /**
   * Tokenize command string into arguments
   * Handles quoted strings and escaping
   */
  _tokenizeCommand(command) {
    if (Array.isArray(command)) {
      return command;
    }

    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (!inQuotes && /\s/.test(char)) {
        if (current) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }
}