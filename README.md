# PodletJS

JavaScript port of [Podlet](https://github.com/containers/podlet)
Generate Podman Quadlet files from Docker run commands and compose files.
This port was created with the help of Claude Code.
I'm cleaning up this code but any suggestions of fixes are welcome.

Complete Docker Compose YAML parsing with multi-service support and systemd integration.

### What's Working

- **Container class**: Full configuration object matching Rust original
- **Quadlet generator**: Converts Container objects to Quadlet INI format  
- **Docker run parser**: Full command line parsing with 40+ flags supported
- **Compose parser**: Complete YAML parsing with multi-service support
- **Service dependencies**: Automatic systemd unit dependencies from depends_on
- **Complex argument handling**: Quoted strings, escaping, multi-value flags
- **Network & volume handling**: Full compose networking and storage support
- **Healthchecks**: Complete healthcheck configuration support
- **Type system**: All core data structures (Volume, PortMapping, Environment, etc.)
- **Main interface**: PodletJS class with complete API
- **Validation**: Container validation and error handling
- **Comprehensive testing**: 200+ test cases covering all scenarios

### Usage

```javascript
import { PodletJS } from './src/index.js';

const podlet = new PodletJS();

// Parse docker-compose files
const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      NODE_ENV: production
    depends_on:
      - db
      
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
`;

const composeQuadlets = podlet.composeToQuadlet(composeYaml, {
  unit: { 
    description: 'My Application Stack',
    after: ['network-online.target'],
    wants: ['network-online.target']
  },
  service: { restart: 'always' },
  install: { wantedBy: ['multi-user.target'] }
});

console.log('Web service:', composeQuadlets.web);
console.log('DB service:', composeQuadlets.db);
```

Outputs:
1st Quadlet
```ini
# Web service with dependency on db
[Unit]
Description=My Application Stack
Wants=network-online.target db.service
After=network-online.target db.service

[Container]
Image=nginx:alpine
ContainerName=web
PublishPort=8080:80
Environment=NODE_ENV=production

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```
2nd Quadlet
```ini
[Unit]
Description=My Application Stack
Wants=network-online.target
After=network-online.target

[Container]
Image=postgres:15
ContainerName=db
Volume=db_data:/var/lib/postgresql/data
Environment=POSTGRES_DB=myapp

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```

### Supported Docker Run Flags

- **Basic**: `--name`, `--image`, commands and arguments
- **Networking**: `-p/--publish`, `--network`, `-h/--hostname`  
- **Storage**: `-v/--volume`, `--tmpfs`, `--mount`
- **Environment**: `-e/--env`, `--env-file`, `--env-host`
- **Security**: `--user`, `--cap-add`, `--cap-drop`, `--security-opt`, `--read-only`
- **Resources**: `--memory`, `--cpus`, `--pids-limit`
- **Runtime**: `--entrypoint`, `--workdir`, `--init`, `--stop-signal`, `--stop-timeout`
- **Health**: `--health-cmd`, `--health-interval`, `--health-timeout`, `--health-retries`
- **Labels**: `-l/--label`, `--annotation`
- **Devices**: `--device`
- **DNS**: `--dns`, `--dns-option`, `--dns-search`
- **Logging**: `--log-driver`, `--log-opt`
- **And many more...**

### Supported Compose Features

- **Services**: `image`, `build`, `command`, `entrypoint`
- **Networking**: `ports`, `networks`, `hostname`, `dns`
- **Storage**: `volumes` (bind, named, tmpfs), `working_dir`
- **Environment**: `environment`, `env_file`
- **Security**: `user`, `cap_add`, `cap_drop`, `security_opt`, `read_only`
- **Health**: `healthcheck` (test, interval, timeout, retries, start_period)
- **Dependencies**: `depends_on` (converted to systemd unit dependencies)
- **Runtime**: `restart`, `tty`, `stdin_open`, `privileged`, `init`
- **Resources**: `mem_limit`, `cpus`
- **Labels**: `labels`, `container_name`
- **And more...**

### Testing

```bash
cd podlet-js
npm install

# Run main test suite
npm test

# Run comprehensive docker run parser tests  
node test/docker-run-test.js

# Run comprehensive compose parser tests
node test/compose-test.js
```

### Possible Future Enhancements

- **Pod generation**: `--pod` flag support for compose files
- **Build contexts**: Full `build` section handling  
- **Advanced networking**: Custom network drivers
- **Secrets/Configs**: When Quadlet supports them
- **Version compatibility**: Podman version-specific features

## Current Limitations

- Some advanced docker run flags added to PodmanArgs only
- Build contexts generate placeholder images
- Advanced compose features like secrets/configs not supported (by design)

## Architecture

```
src/
├── index.js             # Main PodletJS class
├── container.js         # Container configuration class  
├── quadlet-generator.js # Quadlet file generation
├── docker-run-parser.js # Docker run command parser
├── compose-parser.js    # Docker compose file parser
└── types.js            # Core data structures and enums

test/
├── test.js             # Main test suite
├── docker-run-test.js  # Docker run parser tests
└── compose-test.js     # Compose parser tests
```

## Dependencies

- `js-yaml`: YAML parsing for compose files
- `minimist`: Command line argument parsing

## License

MPL-2.0 (same as original Podlet)
