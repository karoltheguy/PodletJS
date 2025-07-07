/**
 * Container class representing a Podman Quadlet container configuration
 * Based on the Rust quadlet::Container struct
 */
export class Container {
  constructor() {
    // Basic container properties
    this.image = '';
    this.containerName = null;
    this.exec = null;
    
    // Capabilities
    this.addCapability = [];
    this.dropCapability = [];
    
    // Devices and mounts
    this.addDevice = [];
    this.mount = [];
    this.volume = [];
    
    // Network configuration
    this.network = [];
    this.networkAlias = [];
    this.publishPort = [];
    this.exposeHostPort = [];
    this.ip = null;
    this.ip6 = null;
    
    // DNS configuration
    this.dns = [];
    this.dnsOption = [];
    this.dnsSearch = [];
    
    // Environment
    this.environment = [];
    this.environmentFile = [];
    this.environmentHost = false;
    
    // Security
    this.noNewPrivileges = false;
    this.securityLabelDisable = false;
    this.securityLabelFileType = null;
    this.securityLabelLevel = null;
    this.securityLabelNested = false;
    this.securityLabelType = null;
    this.seccompProfile = null;
    this.mask = [];
    this.unmask = null;
    
    // User and group
    this.user = null;
    this.group = null;
    this.groupAdd = [];
    this.userNS = null;
    this.uidMap = [];
    this.gidMap = [];
    this.subUidMap = null;
    this.subGidMap = null;
    
    // Runtime options
    this.readOnly = false;
    this.readOnlyTmpfs = true;
    this.runInit = false;
    this.workingDir = null;
    this.hostName = null;
    this.timezone = null;
    this.shmSize = null;
    this.tmpfs = [];
    
    // Health checks
    this.healthCmd = null;
    this.healthInterval = null;
    this.healthOnFailure = null;
    this.healthRetries = null;
    this.healthStartPeriod = null;
    this.healthStartupCmd = null;
    this.healthStartupInterval = null;
    this.healthStartupRetries = null;
    this.healthStartupSuccess = null;
    this.healthStartupTimeout = null;
    this.healthTimeout = null;
    
    // Systemd integration
    this.notify = 'conmon';
    this.stopSignal = null;
    this.stopTimeout = null;
    
    // Pod integration
    this.pod = null;
    
    // Logging
    this.logDriver = null;
    this.logOpt = [];
    
    // Labels and annotations
    this.label = [];
    this.annotation = [];
    
    // Resource limits
    this.pidsLimit = null;
    this.ulimit = [];
    this.sysctl = [];
    
    // Auto update
    this.autoUpdate = null;
    
    // Pull policy
    this.pull = null;
    
    // Secrets
    this.secret = [];
    
    // Rootfs
    this.rootfs = null;
    
    // Entrypoint
    this.entrypoint = null;
    
    // Additional Podman arguments
    this.podmanArgs = null;
  }

  /**
   * Set the container image
   */
  setImage(image) {
    this.image = image;
    return this;
  }

  /**
   * Set the container name
   */
  setContainerName(name) {
    this.containerName = name;
    return this;
  }

  /**
   * Set the exec command
   */
  setExec(command) {
    this.exec = command;
    return this;
  }

  /**
   * Add a published port
   */
  addPublishPort(port) {
    this.publishPort.push(port);
    return this;
  }

  /**
   * Add an environment variable
   */
  addEnvironment(env) {
    this.environment.push(env);
    return this;
  }

  /**
   * Add a volume mount
   */
  addVolume(volume) {
    this.volume.push(volume);
    return this;
  }

  /**
   * Add a label
   */
  addLabel(label) {
    this.label.push(label);
    return this;
  }

  /**
   * Set the pod reference
   */
  setPod(pod) {
    this.pod = pod;
    return this;
  }

  /**
   * Generate the default container name from the image
   */
  getDefaultName() {
    if (this.containerName) {
      return this.containerName;
    }
    
    // Extract name from image (similar to Rust image_to_name function)
    const imageParts = this.image.split('/');
    const imageName = imageParts[imageParts.length - 1];
    
    // Remove tag if present
    const nameWithoutTag = imageName.split(':')[0];
    return nameWithoutTag;
  }

  /**
   * Validate the container configuration
   */
  validate() {
    const errors = [];
    
    if (!this.image) {
      errors.push('Image is required');
    }
    
    return errors;
  }
}