import { ComposeParser } from '../../src/compose-parser.js';
import { Container } from '../../src/container.js';

const minimalCompose = `
version: '3'
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    environment:
      NODE_ENV: production
    volumes:
      - ./data:/data
    labels:
      app: web
`;

describe('ComposeParser', () => {
  let parser;
  beforeEach(() => {
    parser = new ComposeParser();
  });

  it('parses a minimal compose file', () => {
    const containers = parser.parse(minimalCompose);
    expect(containers).toHaveProperty('web');
    const web = containers.web;
    expect(web).toBeInstanceOf(Container);
    expect(web.image).toBe('nginx:latest');
    expect(web.publishPort).toContain('8080:80');
    expect(web.environment).toContain('NODE_ENV=production');
    expect(web.volume).toContain('./data:/data');
    expect(web.label).toContain('app=web');
  });

  it('throws on missing services', () => {
    const badYaml = `version: '3'`;
    expect(() => parser.parse(badYaml)).toThrow('Compose file must contain at least one service');
  });

  it('throws on service missing image/build', () => {
    const badYaml = `
version: '3'
services:
  foo:
    ports:
      - "80:80"
`;
    expect(() => parser.parse(badYaml)).toThrow("Service 'foo' must have either 'image' or 'build'");
  });

  it('parses service with build context', () => {
    const yaml = `
version: '3'
services:
  builder:
    build: .
`;
    const containers = parser.parse(yaml);
    expect(containers).toHaveProperty('builder');
    expect(containers.builder.image).toBe('builder.build');
  });

  it('parses array and object environment', () => {
    const yaml = `
version: '3'
services:
  envtest:
    image: node
    environment:
      - FOO=bar
      - BAZ=qux
`;
    const containers = parser.parse(yaml);
    expect(containers.envtest.environment).toContain('FOO=bar');
    expect(containers.envtest.environment).toContain('BAZ=qux');

    const yamlObj = `
version: '3'
services:
  envtest:
    image: node
    environment:
      FOO: bar
      BAZ: qux
`;
    const containersObj = parser.parse(yamlObj);
    expect(containersObj.envtest.environment).toContain('FOO=bar');
    expect(containersObj.envtest.environment).toContain('BAZ=qux');
  });

  it('parses ports in long form', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    ports:
      - target: 80
        published: 8080
        protocol: tcp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.publishPort).toContain('8080:80');
  });

  it('parses volumes in long form', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    volumes:
      - type: bind
        source: ./src
        target: /app
        read_only: true
`;
    const containers = parser.parse(yaml);
    expect(containers.web.volume).toContain('./src:/app:ro');
  });

  it('parses labels as array and object', () => {
    const yamlArr = `
version: '3'
services:
  web:
    image: nginx
    labels:
      - foo=bar
      - baz=qux
`;
    const containersArr = parser.parse(yamlArr);
    expect(containersArr.web.label).toContain('foo=bar');
    expect(containersArr.web.label).toContain('baz=qux');

    const yamlObj = `
version: '3'
services:
  web:
    image: nginx
    labels:
      foo: bar
      baz: qux
`;
    const containersObj = parser.parse(yamlObj);
    expect(containersObj.web.label).toContain('foo=bar');
    expect(containersObj.web.label).toContain('baz=qux');
  });

  it('throws on unsupported top-level feature configs', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
configs:
  foo: {}
`;
    expect(() => parser.parse(yaml)).toThrow("Compose feature 'configs' is not yet supported");
  });

  it('warns on unsupported service features', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    external_links:
      - foo
    links:
      - bar
    network_mode: host
    secrets:
      - mysecret
    configs:
      - myconfig
    deploy:
      replicas: 2
`;
    // This test checks that no error is thrown, but warnings are logged
    expect(() => parser.parse(yaml)).not.toThrow();
  });

  it('parses container_name', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    container_name: customname
`;
    const containers = parser.parse(yaml);
    expect(containers.web.containerName).toBe('customname');
  });

  it('parses command and entrypoint as array and string', () => {
    const yamlArr = `
version: '3'
services:
  web:
    image: nginx
    command:
      - echo
      - hello
    entrypoint:
      - sh
      - -c
`;
    const containersArr = parser.parse(yamlArr);
    expect(containersArr.web.exec).toBe('echo hello');
    expect(containersArr.web.entrypoint).toBe('sh -c');

    const yamlStr = `
version: '3'
services:
  web:
    image: nginx
    command: echo hello
    entrypoint: sh -c
`;
    const containersStr = parser.parse(yamlStr);
    expect(containersStr.web.exec).toBe('echo hello');
    expect(containersStr.web.entrypoint).toBe('sh -c');
  });

  it('parses env_file', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    env_file:
      - .env
      - .env.local
`;
    const containers = parser.parse(yaml);
    expect(containers.web.environmentFile).toContain('.env');
    expect(containers.web.environmentFile).toContain('.env.local');
  });

  it('parses hostname, user, working_dir, restart', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    hostname: myhost
    user: user1:group1
    working_dir: /app
    restart: always
`;
    const containers = parser.parse(yaml);
    expect(containers.web.hostName).toBe('myhost');
    expect(containers.web.user).toBe('user1');
    expect(containers.web.group).toBe('group1');
    expect(containers.web.workingDir).toBe('/app');
    expect(containers.web._restart).toBe('always');
  });

  it('parses security_opt', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    security_opt:
      - no-new-privileges:true
      - label=disable
      - seccomp=unconfined
`;
    const containers = parser.parse(yaml);
    expect(containers.web.noNewPrivileges).toBe(true);
    expect(containers.web.securityLabelDisable).toBe(true);
    expect(containers.web.podmanArgs).toMatch(/--security-opt seccomp=unconfined/);
  });

  it('parses cap_add, cap_drop, devices, dns', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    cap_add:
      - NET_ADMIN
    cap_drop:
      - SYS_ADMIN
    devices:
      - /dev/null
    dns:
      - 8.8.8.8
`;
    const containers = parser.parse(yaml);
    expect(containers.web.addCapability).toContain('NET_ADMIN');
    expect(containers.web.dropCapability).toContain('SYS_ADMIN');
    expect(containers.web.addDevice).toContain('/dev/null');
    expect(containers.web.dns).toContain('8.8.8.8');
  });

  it('parses read_only, init, tmpfs', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    read_only: true
    init: true
    tmpfs:
      - /tmp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.readOnly).toBe(true);
    expect(containers.web.runInit).toBe(true);
    expect(containers.web.tmpfs).toContain('/tmp');
  });

  it('parses privileged, tty, stdin_open, mem_limit, cpus', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    privileged: true
    tty: true
    stdin_open: true
    mem_limit: 128m
    cpus: 2
`;
    const containers = parser.parse(yaml);
    expect(containers.web.podmanArgs).toMatch(/--privileged/);
    expect(containers.web.podmanArgs).toMatch(/--tty/);
    expect(containers.web.podmanArgs).toMatch(/--interactive/);
    expect(containers.web.podmanArgs).toMatch(/--memory 128m/);
    expect(containers.web.podmanArgs).toMatch(/--cpus 2/);
  });

  it('parses healthcheck', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 1m30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
    const containers = parser.parse(yaml);
    expect(containers.web.healthCmd).toBe('CMD curl -f http://localhost');
    expect(containers.web.healthInterval).toBe('1m30s');
    expect(containers.web.healthTimeout).toBe('10s');
    expect(containers.web.healthRetries).toBe(3);
    expect(containers.web.healthStartPeriod).toBe('40s');
  });

  it('parses healthcheck disable', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    healthcheck:
      disable: true
`;
    const containers = parser.parse(yaml);
    expect(containers.web.healthCmd).toBe('none');
  });

  it('parses depends_on as array and object', () => {
    const yamlArr = `
version: '3'
services:
  web:
    image: nginx
    depends_on:
      - db
      - cache
`;
    const containersArr = parser.parse(yamlArr);
    expect(containersArr.web._dependsOn).toEqual(['db', 'cache']);

    const yamlObj = `
version: '3'
services:
  web:
    image: nginx
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_started }
`;
    const containersObj = parser.parse(yamlObj);
    expect(containersObj.web._dependsOn).toEqual(['db', 'cache']);
  });

  it('parses networks with ipv4_address and aliases', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    networks:
      custom:
        ipv4_address: 172.16.238.10
        aliases:
          - alias1
          - alias2
`;
    const containers = parser.parse(yaml);
    expect(containers.web.network).toContain('custom:ip=172.16.238.10');
    expect(containers.web.networkAlias).toContain('alias1');
    expect(containers.web.networkAlias).toContain('alias2');
  });

  it('throws on invalid YAML', () => {
    const invalidYaml = '{ invalid: yaml: content: [';
    expect(() => parser.parse(invalidYaml)).toThrow();
  });

  it('throws on null or non-object compose content', () => {
    expect(() => parser.parse('null')).toThrow('Invalid compose file format');
    expect(() => parser.parse('"string"')).toThrow('Invalid compose file format');
  });

  it('parses volumes with no source', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    volumes:
      - type: bind
        target: /app
`;
    const containers = parser.parse(yaml);
    expect(containers.web.volume).toContain('/app');
  });

  it('parses tmpfs volumes', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    volumes:
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100m
`;
    const containers = parser.parse(yaml);
    expect(containers.web.tmpfs).toContain('/tmp:size=100m');
  });

  it('parses tmpfs volumes without size', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    volumes:
      - type: tmpfs
        target: /tmp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.tmpfs).toContain('/tmp');
  });

  it('parses complex image names', () => {
    const yaml = `
version: '3'
services:
  web:
    image: registry.example.com/namespace/image:tag
`;
    const containers = parser.parse(yaml);
    expect(containers.web.image).toBe('registry.example.com/namespace/image:tag');
    expect(containers.web.containerName).toBe('web');
  });

  it('parses image with multiple slashes', () => {
    const yaml = `
version: '3'
services:
  web:
    image: docker.io/library/nginx:latest
`;
    const containers = parser.parse(yaml);
    expect(containers.web.image).toBe('docker.io/library/nginx:latest');
    expect(containers.web.containerName).toBe('web');
  });

  it('escapes arguments with special characters', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    mem_limit: '128m with spaces'
    command: 'echo "hello world"'
`;
    const containers = parser.parse(yaml);
    expect(containers.web.podmanArgs).toMatch(/--memory "128m with spaces"/);
    expect(containers.web.exec).toBe('echo "hello world"');
  });

  it('parses ports as numbers', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    ports:
      - 8080
`;
    const containers = parser.parse(yaml);
    expect(containers.web.publishPort).toContain('8080');
  });

  it('parses ports with protocol in long form', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    ports:
      - target: 80
        published: 8080
        protocol: udp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.publishPort).toContain('8080:80/udp');
  });

  it('parses ports without published port in long form', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    ports:
      - target: 80
        protocol: tcp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.publishPort).toContain('80');
  });

  it('parses user without group', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    user: myuser
`;
    const containers = parser.parse(yaml);
    expect(containers.web.user).toBe('myuser');
    expect(containers.web.group).toBeNull();
  });

  it('parses numeric user', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    user: 1000
`;
    const containers = parser.parse(yaml);
    expect(containers.web.user).toBe('1000');
  });

  it('handles empty compose volumes', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
volumes: {}
`;
    const containers = parser.parse(yaml);
    expect(containers.web.image).toBe('nginx');
  });

  it('parses single env_file as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    env_file: .env
`;
    const containers = parser.parse(yaml);
    expect(containers.web.environmentFile).toContain('.env');
  });

  it('parses single cap_add and cap_drop as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    cap_add: NET_ADMIN
    cap_drop: SYS_ADMIN
`;
    const containers = parser.parse(yaml);
    expect(containers.web.addCapability).toContain('NET_ADMIN');
    expect(containers.web.dropCapability).toContain('SYS_ADMIN');
  });

  it('parses single device as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    devices: /dev/null
`;
    const containers = parser.parse(yaml);
    expect(containers.web.addDevice).toContain('/dev/null');
  });

  it('parses single dns as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    dns: 8.8.8.8
`;
    const containers = parser.parse(yaml);
    expect(containers.web.dns).toContain('8.8.8.8');
  });

  it('parses single tmpfs as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    tmpfs: /tmp
`;
    const containers = parser.parse(yaml);
    expect(containers.web.tmpfs).toContain('/tmp');
  });

  it('parses healthcheck with string test', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    healthcheck:
      test: "curl -f http://localhost"
`;
    const containers = parser.parse(yaml);
    expect(containers.web.healthCmd).toBe('curl -f http://localhost');
  });

  it('parses networks as array of strings', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    networks:
      - frontend
      - backend
`;
    const containers = parser.parse(yaml);
    expect(containers.web.network).toContain('frontend');
    expect(containers.web.network).toContain('backend');
  });

  it('parses network with empty config', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    networks:
      frontend: {}
`;
    const containers = parser.parse(yaml);
    expect(containers.web.network).toContain('frontend');
  });

  it('parses single security_opt as string', () => {
    const yaml = `
version: '3'
services:
  web:
    image: nginx
    security_opt: no-new-privileges:true
`;
    const containers = parser.parse(yaml);
    expect(containers.web.noNewPrivileges).toBe(true);
  });
});
