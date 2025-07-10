import { Container } from '../../src/container.js';

describe('Container', () => {
  it('should set image', () => {
    const c = new Container();
    c.setImage('nginx:latest');
    expect(c.image).toBe('nginx:latest');
  });

  it('should set container name', () => {
    const c = new Container();
    c.setContainerName('my-container');
    expect(c.containerName).toBe('my-container');
  });

  it('should set exec command', () => {
    const c = new Container();
    c.setExec('/bin/bash');
    expect(c.exec).toBe('/bin/bash');
  });

  it('should add published port', () => {
    const c = new Container();
    c.addPublishPort('8080:80');
    expect(c.publishPort).toContain('8080:80');
  });

  it('should add environment variable', () => {
    const c = new Container();
    c.addEnvironment('NODE_ENV=production');
    expect(c.environment).toContain('NODE_ENV=production');
  });

  it('should add volume', () => {
    const c = new Container();
    c.addVolume('/data');
    expect(c.volume).toContain('/data');
  });

  it('should add label', () => {
    const c = new Container();
    c.addLabel('maintainer=carol');
    expect(c.label).toContain('maintainer=carol');
  });

  it('should set pod', () => {
    const c = new Container();
    c.setPod('mypod');
    expect(c.pod).toBe('mypod');
  });

  it('should generate default name from image', () => {
    const c = new Container();
    c.setImage('nginx:latest');
    expect(c.getDefaultName()).toBe('nginx');
  });

  it('should use containerName if set for default name', () => {
    const c = new Container();
    c.setImage('nginx:latest');
    c.setContainerName('custom');
    expect(c.getDefaultName()).toBe('custom');
  });

  it('should validate missing image', () => {
    const c = new Container();
    expect(c.validate()).toContain('Image is required');
  });

  it('should validate with image set', () => {
    const c = new Container();
    c.setImage('nginx:latest');
    expect(c.validate()).toEqual([]);
  });

  it('should handle complex image names in getDefaultName', () => {
    const c = new Container();
    c.setImage('registry.example.com/namespace/image:tag');
    expect(c.getDefaultName()).toBe('image');
  });

  it('should handle image with multiple slashes', () => {
    const c = new Container();
    c.setImage('docker.io/library/nginx:latest');
    expect(c.getDefaultName()).toBe('nginx');
  });

  it('should handle image without tag', () => {
    const c = new Container();
    c.setImage('nginx');
    expect(c.getDefaultName()).toBe('nginx');
  });

  it('should return empty string for getDefaultName with no image', () => {
    const c = new Container();
    expect(c.getDefaultName()).toBe('');
  });

  it('should chain method calls', () => {
    const c = new Container();
    const result = c.setImage('nginx')
                   .setContainerName('test')
                   .addPublishPort('80:80')
                   .addEnvironment('NODE_ENV=prod')
                   .addVolume('/data')
                   .addLabel('app=web')
                   .setPod('mypod');
    
    expect(result).toBe(c);
    expect(c.image).toBe('nginx');
    expect(c.containerName).toBe('test');
    expect(c.publishPort).toContain('80:80');
    expect(c.environment).toContain('NODE_ENV=prod');
    expect(c.volume).toContain('/data');
    expect(c.label).toContain('app=web');
    expect(c.pod).toBe('mypod');
  });

  it('should initialize all properties correctly', () => {
    const c = new Container();
    
    // Test that arrays are initialized
    expect(Array.isArray(c.addCapability)).toBe(true);
    expect(Array.isArray(c.dropCapability)).toBe(true);
    expect(Array.isArray(c.addDevice)).toBe(true);
    expect(Array.isArray(c.mount)).toBe(true);
    expect(Array.isArray(c.volume)).toBe(true);
    expect(Array.isArray(c.network)).toBe(true);
    expect(Array.isArray(c.networkAlias)).toBe(true);
    expect(Array.isArray(c.publishPort)).toBe(true);
    expect(Array.isArray(c.exposeHostPort)).toBe(true);
    expect(Array.isArray(c.dns)).toBe(true);
    expect(Array.isArray(c.dnsOption)).toBe(true);
    expect(Array.isArray(c.dnsSearch)).toBe(true);
    expect(Array.isArray(c.environment)).toBe(true);
    expect(Array.isArray(c.environmentFile)).toBe(true);
    
    // Test that boolean properties have correct defaults
    expect(c.environmentHost).toBe(false);
    expect(c.noNewPrivileges).toBe(false);
    expect(c.securityLabelDisable).toBe(false);
    expect(c.securityLabelNested).toBe(false);
    expect(c.readOnly).toBe(false);
    expect(c.readOnlyTmpfs).toBe(true);
    expect(c.runInit).toBe(false);
    
    // Test that string properties start as null or default values
    expect(c.image).toBe('');
    expect(c.containerName).toBeNull();
    expect(c.exec).toBeNull();
    expect(c.notify).toBe('conmon');
  });
});
