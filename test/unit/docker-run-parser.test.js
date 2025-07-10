import { DockerRunParser } from '../../src/docker-run-parser.js';
import { Container } from '../../src/container.js';

describe('DockerRunParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DockerRunParser();
  });

  describe('basic parsing', () => {
    it('parses minimal docker run command', () => {
      const command = 'docker run nginx';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
      expect(container.image).toBe('nginx');
    });

    it('parses minimal podman run command', () => {
      const command = 'podman run nginx';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
      expect(container.image).toBe('nginx');
    });

    it('parses run command without docker/podman prefix', () => {
      const command = 'run nginx';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
      expect(container.image).toBe('nginx');
    });

    it('parses image with command', () => {
      const command = 'docker run nginx echo hello world';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
      expect(container.exec).toBe('echo hello world');
    });
  });

  describe('container name', () => {
    it('parses --name flag', () => {
      const command = 'docker run --name mycontainer nginx';
      const container = parser.parse(command);
      
      expect(container.containerName).toBe('mycontainer');
      expect(container.image).toBe('nginx');
    });
  });

  describe('port publishing', () => {
    it('parses -p flag', () => {
      const command = 'docker run -p 8080:80 nginx';
      const container = parser.parse(command);
      
      expect(container.publishPort).toContain('8080:80');
      expect(container.image).toBe('nginx');
    });

    it('parses --publish flag', () => {
      const command = 'docker run --publish 8080:80 nginx';
      const container = parser.parse(command);
      
      expect(container.publishPort).toContain('8080:80');
    });

    it('parses multiple port mappings', () => {
      const command = 'docker run -p 8080:80 -p 9090:90 nginx';
      const container = parser.parse(command);
      
      expect(container.publishPort).toContain('8080:80');
      expect(container.publishPort).toContain('9090:90');
    });
  });

  describe('volume mounting', () => {
    it('parses -v flag', () => {
      const command = 'docker run -v /host:/container nginx';
      const container = parser.parse(command);
      
      expect(container.volume).toContain('/host:/container');
    });

    it('parses --volume flag', () => {
      const command = 'docker run --volume /host:/container:ro nginx';
      const container = parser.parse(command);
      
      expect(container.volume).toContain('/host:/container:ro');
    });

    it('parses multiple volumes', () => {
      const command = 'docker run -v /data:/data -v /logs:/logs nginx';
      const container = parser.parse(command);
      
      expect(container.volume).toContain('/data:/data');
      expect(container.volume).toContain('/logs:/logs');
    });
  });

  describe('environment variables', () => {
    it('parses -e flag', () => {
      const command = 'docker run -e NODE_ENV=production nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=production');
    });

    it('parses --env flag', () => {
      const command = 'docker run --env NODE_ENV=production nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=production');
    });

    it('parses --environment flag', () => {
      const command = 'docker run --environment NODE_ENV=production nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=production');
    });

    it('parses multiple environment variables', () => {
      const command = 'docker run -e NODE_ENV=production -e PORT=3000 nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=production');
      expect(container.environment).toContain('PORT=3000');
    });

    it('parses --env-file flag', () => {
      const command = 'docker run --env-file .env nginx';
      const container = parser.parse(command);
      
      expect(container.environmentFile).toContain('.env');
    });
  });

  describe('labels', () => {
    it('parses -l flag', () => {
      const command = 'docker run -l app=web nginx';
      const container = parser.parse(command);
      
      expect(container.label).toContain('app=web');
    });

    it('parses --label flag', () => {
      const command = 'docker run --label version=1.0 nginx';
      const container = parser.parse(command);
      
      expect(container.label).toContain('version=1.0');
    });

    it('parses multiple labels', () => {
      const command = 'docker run -l app=web -l version=1.0 nginx';
      const container = parser.parse(command);
      
      expect(container.label).toContain('app=web');
      expect(container.label).toContain('version=1.0');
    });
  });

  describe('network configuration', () => {
    it('parses --network flag', () => {
      const command = 'docker run --network mynet nginx';
      const container = parser.parse(command);
      
      expect(container.network).toContain('mynet');
    });
  });

  describe('working directory', () => {
    it('parses -w flag', () => {
      const command = 'docker run -w /app nginx';
      const container = parser.parse(command);
      
      expect(container.workingDir).toBe('/app');
    });

    it('parses --workdir flag', () => {
      const command = 'docker run --workdir /app nginx';
      const container = parser.parse(command);
      
      expect(container.workingDir).toBe('/app');
    });
  });

  describe('user configuration', () => {
    it('parses -u flag with user only', () => {
      const command = 'docker run -u myuser nginx';
      const container = parser.parse(command);
      
      expect(container.user).toBe('myuser');
      expect(container.group).toBeNull();
    });

    it('parses --user flag with user:group', () => {
      const command = 'docker run --user myuser:mygroup nginx';
      const container = parser.parse(command);
      
      expect(container.user).toBe('myuser');
      expect(container.group).toBe('mygroup');
    });
  });

  describe('hostname', () => {
    it('parses -h flag', () => {
      const command = 'docker run -h myhost nginx';
      const container = parser.parse(command);
      
      expect(container.hostName).toBe('myhost');
    });

    it('parses --hostname flag', () => {
      const command = 'docker run --hostname myhost nginx';
      const container = parser.parse(command);
      
      expect(container.hostName).toBe('myhost');
    });
  });

  describe('entrypoint', () => {
    it('parses --entrypoint flag', () => {
      const command = 'docker run --entrypoint /bin/sh nginx';
      const container = parser.parse(command);
      
      expect(container.entrypoint).toBe('/bin/sh');
    });
  });

  describe('devices', () => {
    it('parses --device flag', () => {
      const command = 'docker run --device /dev/null nginx';
      const container = parser.parse(command);
      
      expect(container.addDevice).toContain('/dev/null:/dev/null');
    });
  });

  describe('capabilities', () => {
    it('parses --cap-add flag', () => {
      const command = 'docker run --cap-add NET_ADMIN nginx';
      const container = parser.parse(command);
      
      expect(container.addCapability).toContain('NET_ADMIN');
    });

    it('parses --cap-drop flag', () => {
      const command = 'docker run --cap-drop SYS_ADMIN nginx';
      const container = parser.parse(command);
      
      expect(container.dropCapability).toContain('SYS_ADMIN');
    });
  });

  describe('DNS configuration', () => {
    it('parses --dns flag', () => {
      const command = 'docker run --dns 8.8.8.8 nginx';
      const container = parser.parse(command);
      
      expect(container.dns).toContain('8.8.8.8');
    });
  });

  describe('security options', () => {
    it('parses --security-opt no-new-privileges', () => {
      const command = 'docker run --security-opt no-new-privileges:true nginx';
      const container = parser.parse(command);
      
      expect(container.noNewPrivileges).toBe(true);
    });

    it('parses --security-opt label=disable', () => {
      const command = 'docker run --security-opt label=disable nginx';
      const container = parser.parse(command);
      
      expect(container.securityLabelDisable).toBe(true);
    });

    it('parses --security-opt seccomp', () => {
      const command = 'docker run --security-opt seccomp=unconfined nginx';
      const container = parser.parse(command);
      
      expect(container.seccompProfile).toBe('unconfined');
    });

    it('parses unknown security-opt to podmanArgs', () => {
      const command = 'docker run --security-opt unknown=value nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--security-opt unknown=value/);
    });
  });

  describe('read-only', () => {
    it('parses --read-only flag', () => {
      const command = 'docker run --read-only nginx';
      const container = parser.parse(command);
      
      expect(container.readOnly).toBe(true);
    });
  });

  describe('TTY and interactive', () => {
    it('parses -t flag', () => {
      const command = 'docker run -t nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/-t/);
    });

    it('parses --tty flag', () => {
      const command = 'docker run --tty nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--tty/);
    });

    it('parses -i flag', () => {
      const command = 'docker run -i nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/-i/);
    });

    it('parses --interactive flag', () => {
      const command = 'docker run --interactive nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--interactive/);
    });
  });

  describe('detach and remove (ignored)', () => {
    it('parses -d flag (ignored)', () => {
      const command = 'docker run -d nginx';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
      // -d should be ignored, not added to podmanArgs
    });

    it('parses --detach flag (ignored)', () => {
      const command = 'docker run --detach nginx';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
    });

    it('parses --rm flag (ignored)', () => {
      const command = 'docker run --rm nginx';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
    });
  });

  describe('restart policy', () => {
    it('parses --restart flag (ignored)', () => {
      const command = 'docker run --restart always nginx';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
    });
  });

  describe('memory and CPU limits', () => {
    it('parses -m flag', () => {
      const command = 'docker run -m 128m nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/-m 128m/);
    });

    it('parses --memory flag', () => {
      const command = 'docker run --memory 256m nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--memory 256m/);
    });

    it('parses --cpus flag', () => {
      const command = 'docker run --cpus 2 nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--cpus 2/);
    });
  });

  describe('pull policy', () => {
    it('parses --pull flag', () => {
      const command = 'docker run --pull always nginx';
      const container = parser.parse(command);
      
      expect(container.pull).toBe('always');
    });
  });

  describe('stop configuration', () => {
    it('parses --stop-signal flag', () => {
      const command = 'docker run --stop-signal SIGKILL nginx';
      const container = parser.parse(command);
      
      expect(container.stopSignal).toBe('SIGKILL');
    });

    it('parses --stop-timeout flag', () => {
      const command = 'docker run --stop-timeout 30 nginx';
      const container = parser.parse(command);
      
      expect(container.stopTimeout).toBe(30);
    });
  });

  describe('health check', () => {
    it('parses --health-cmd flag', () => {
      const command = 'docker run --health-cmd "curl -f http://localhost" nginx';
      const container = parser.parse(command);
      
      expect(container.healthCmd).toBe('curl -f http://localhost');
    });
  });

  describe('tmpfs', () => {
    it('parses --tmpfs flag', () => {
      const command = 'docker run --tmpfs /tmp nginx';
      const container = parser.parse(command);
      
      expect(container.tmpfs).toContain('/tmp');
    });
  });

  describe('init', () => {
    it('parses --init flag', () => {
      const command = 'docker run --init nginx';
      const container = parser.parse(command);
      
      expect(container.runInit).toBe(true);
    });
  });

  describe('unknown flags', () => {
    it('handles unknown flags without values', () => {
      const command = 'docker run --unknown-flag nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--unknown-flag/);
      expect(container.image).toBe('nginx');
    });

    it('handles unknown flags with values', () => {
      const command = 'docker run --unknown-flag value nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--unknown-flag value/);
      expect(container.image).toBe('nginx');
    });

    it('handles unknown short flags', () => {
      const command = 'docker run -x nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/-x/);
      expect(container.image).toBe('nginx');
    });

    it('handles unknown flags with equals values', () => {
      const command = 'docker run --unknown-flag=value nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--unknown-flag=value/);
      expect(container.image).toBe('nginx');
    });

    it('handles unknown flags with numeric values', () => {
      const command = 'docker run --unknown-flag 123 nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--unknown-flag 123/);
      expect(container.image).toBe('nginx');
    });

    it('handles unknown flags with size values', () => {
      const command = 'docker run --unknown-flag 128m nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--unknown-flag 128m/);
      expect(container.image).toBe('nginx');
    });

    it('does not consume image as value for boolean-style unknown flags', () => {
      const command = 'docker run --some-boolean-flag nginx echo hello';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--some-boolean-flag/);
      expect(container.image).toBe('nginx');
      expect(container.exec).toBe('echo hello');
    });
  });

  describe('command tokenization', () => {
    it('handles quoted arguments', () => {
      const command = 'docker run -e "NODE_ENV=test with spaces" nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=test with spaces');
    });

    it('handles single quoted arguments', () => {
      const command = "docker run -e 'NODE_ENV=test with spaces' nginx";
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=test with spaces');
    });

    it('handles escaped characters', () => {
      const command = 'docker run -e NODE_ENV=test\\ with\\ spaces nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=test with spaces');
    });

    it('handles complex quoted command', () => {
      const command = 'docker run nginx sh -c "echo \\"hello world\\""';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
      expect(container.exec).toBe('sh -c echo "hello world"');
    });

    it('handles array input', () => {
      const command = ['docker', 'run', '-p', '8080:80', 'nginx'];
      const container = parser.parse(command);
      
      expect(container.publishPort).toContain('8080:80');
      expect(container.image).toBe('nginx');
    });
  });

  describe('argument escaping', () => {
    it('escapes arguments with spaces', () => {
      const command = 'docker run --memory "128 MB" nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--memory "128 MB"/);
    });

    it('escapes arguments with special characters', () => {
      const command = 'docker run --memory "128m;rm -rf /" nginx';
      const container = parser.parse(command);
      
      expect(container.podmanArgs).toMatch(/--memory "128m;rm -rf \/"/);
    });

    it('handles numeric arguments', () => {
      const command = 'docker run --stop-timeout 30 nginx';
      const container = parser.parse(command);
      
      expect(container.stopTimeout).toBe(30);
    });
  });

  describe('complex combinations', () => {
    it('parses complex command with many flags', () => {
      const command = 'docker run -d --name myapp -p 8080:80 -v /data:/data -e NODE_ENV=production --network mynet --user 1000:1000 -w /app --memory 512m --cpus 2 nginx:latest sh -c "npm start"';
      const container = parser.parse(command);
      
      expect(container.containerName).toBe('myapp');
      expect(container.publishPort).toContain('8080:80');
      expect(container.volume).toContain('/data:/data');
      expect(container.environment).toContain('NODE_ENV=production');
      expect(container.network).toContain('mynet');
      expect(container.user).toBe('1000');
      expect(container.group).toBe('1000');
      expect(container.workingDir).toBe('/app');
      expect(container.podmanArgs).toMatch(/--memory 512m/);
      expect(container.podmanArgs).toMatch(/--cpus 2/);
      expect(container.image).toBe('nginx:latest');
      expect(container.exec).toBe('sh -c npm start');
    });

    it('handles flags after image and before command', () => {
      const command = 'docker run nginx --help';
      const container = parser.parse(command);
      
      expect(container.image).toBe('nginx');
      expect(container.exec).toBe('--help');
    });
  });

  describe('edge cases', () => {
    it('handles empty command', () => {
      const command = '';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
    });

    it('handles command with only whitespace', () => {
      const command = '   ';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
    });

    it('handles command without image', () => {
      const command = 'docker run';
      const container = parser.parse(command);
      
      expect(container).toBeInstanceOf(Container);
      expect(container.image).toBe('');
    });

    it('handles unterminated quotes gracefully', () => {
      const command = 'docker run -e "NODE_ENV=production nginx';
      const container = parser.parse(command);
      
      expect(container.environment).toContain('NODE_ENV=production nginx');
    });
  });
});
