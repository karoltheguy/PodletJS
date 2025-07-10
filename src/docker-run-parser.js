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
    // Handle flags with embedded values (--flag=value)
    if (flag.includes('=')) {
      const [flagPart] = flag.split('=', 1);
      const cleanFlag = flagPart.replace(/^-+/, '');
      const mapping = this.flagMappings[cleanFlag];
      
      if (!mapping) {
        // Unknown flag with embedded value - add to podmanArgs as-is
        return this._handleUnknownFlag(flag, args, startIndex, container);
      }
      
      // For known flags with embedded values, we need to split and handle
      const [, valuePart] = flag.split('=', 2);
      const modifiedArgs = [...args];
      modifiedArgs[startIndex] = flagPart;
      modifiedArgs.splice(startIndex + 1, 0, valuePart);
      return mapping.handler(modifiedArgs, startIndex, container);
    }
    
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
    
    // For flags with embedded values (--flag=value), we're done
    if (flag.includes('=')) {
      container.podmanArgs = podmanArgs;
      return { nextIndex };
    }
    
    // For flags without embedded values, decide whether to consume the next argument
    if (nextIndex < args.length && !args[nextIndex].startsWith('-')) {
      const nextArg = args[nextIndex];
      
      // Check if the next argument looks like a flag value rather than an image name
      if (this._looksLikeFlagValue(nextArg, args, nextIndex)) {
        podmanArgs += ' ' + this._escapeArg(nextArg);
        nextIndex++;
      }
    }
    
    container.podmanArgs = podmanArgs;
    return { nextIndex };
  }

  /**
   * Determine if an argument looks like a flag value rather than an image name
   */
  _looksLikeFlagValue(arg, args, argIndex) {
    // Clear indicators that this is a flag value
    if (arg.includes('=') || 
        arg.match(/^\d+[kmgtKMGT]?$/) || // memory/size values like "128m", "1G"
        arg.match(/^\d+(\.\d+)?$/) ||    // numeric values like "2", "1.5"
        arg.match(/^[a-z][a-z0-9]*:/) || // values with format like "tcp:", "host:"
        arg.includes(':') && !arg.includes('/')) { // port mappings but not image names
      return true;
    }
    
    // Look ahead to see if there's a more likely image name later
    for (let i = argIndex + 1; i < args.length; i++) {
      const laterArg = args[i];
      if (laterArg.startsWith('-')) {
        continue; // Skip flags
      }
      
      // If we find something that looks more like an image name, 
      // then the current arg is probably a flag value
      if (this._looksLikeImageName(laterArg) && !this._looksLikeImageName(arg)) {
        return true;
      }
      
      // If we find something that looks like a command, stop looking
      if (this._looksLikeCommand(laterArg)) {
        break;
      }
    }
    
    // If the argument doesn't look like an image name, it's probably a flag value
    return !this._looksLikeImageName(arg);
  }

  /**
   * Determine if an argument looks like an image name
   */
  _looksLikeImageName(arg) {
    // Common image names (definitive matches)
    const commonImages = ['nginx', 'ubuntu', 'alpine', 'node', 'python', 'java', 'redis', 'mysql', 'postgres', 'mongo', 'httpd', 'tomcat', 'php', 'ruby', 'golang', 'gcc', 'openjdk', 'busybox'];
    if (commonImages.includes(arg.toLowerCase())) {
      return true;
    }
    
    // Registry prefixes like "docker.io/nginx" or "gcr.io/project/image"
    if (arg.includes('/')) {
      return true;
    }
    
    // Tags like "nginx:latest" or "node:16"
    if (arg.includes(':') && !arg.startsWith(':')) {
      return true;
    }
    
    // Image names with clear naming patterns
    if (arg.match(/^[a-z0-9]+[a-z0-9._-]*$/i) && 
        (arg.includes('-') || arg.includes('_') || arg.includes('.') || arg.length > 6)) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine if an argument looks like a command
   */
  _looksLikeCommand(arg) {
    // Commands often start with common command names or paths
    return arg.match(/^(\/|sh|bash|ls|cat|echo|python|node|npm|yarn|make|gcc|java|\.)/);
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