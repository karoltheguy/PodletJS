[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/karoltheguy/PodletJS)
[![NPM Deployment](https://github.com/karoltheguy/podletjs/actions/workflows/npm-publish.yml/badge.svg?branch=main)](https://github.com/karoltheguy/podletjs/actions/workflows/npm-publish.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Coverage Status](https://coveralls.io/repos/github/karoltheguy/PodletJS/badge.svg?branch=main)](https://coveralls.io/github/karoltheguy/PodletJS?branch=main)
[![Space Metric](https://karoltheguy.testspace.com/spaces/315045/badge?token=981561dcb436657946cc80d48e61caa818411f2b)](https://karoltheguy.testspace.com/spaces/315045?utm_campaign=metric&utm_medium=referral&utm_source=badge "Test Cases")
[![codecov](https://codecov.io/gh/karoltheguy/PodletJS/branch/main/graph/badge.svg?token=NDPILSMFQ3)](https://codecov.io/gh/karoltheguy/PodletJS)

![Lines](./badges_output/lines.svg) ![Statements](./badges_output/statements.svg)  ![Branches](./badges_output/branches.svg)  ![Functions](./badges_output/functions.svg)

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

## Installation

```bash
npm install podletjs
```

## Developping

```bash
# Clone the repository
git clone https://github.com/karoltheguy/podletjs.git
cd podletjs

# Install dependencies
npm install
```

### Usage

```javascript
import { PodletJS } from 'podletjs';

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

console.log('Web service filename:', composeQuadlets[0].filename);
console.log('Web service:', composeQuadlets[0].content);
console.log('DB service filename:', composeQuadlets[1].filename);
console.log('DB service:', composeQuadlets[1].content);
```

Outputs:
1st Quadlet (`web.container`)
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
2nd Quadlet (`db.container`)
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

```javascript
// Parse Docker run commands
const dockerRunCommand = `docker run -d --name web-server -p 8080:80 -e NODE_ENV=production -v data:/app/data nginx:alpine`;
const runQuadlet = podlet.dockerRunToQuadlet(dockerRunCommand, {
  unit: { description: 'Web Server Container' },
  service: { restart: 'always' },
  install: { wantedBy: ['multi-user.target'] }
});

console.log('Docker run Quadlet:', runQuadlet);
```

Outputs:
```ini
[Unit]
Description=Web Server Container

[Container]
Image=nginx:alpine
ContainerName=web-server
PublishPort=8080:80
Volume=data:/app/data
Environment=NODE_ENV=production

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
# Install dependencies
npm install

# Run all tests (unit + e2e)
npm run test:all

# Run only unit tests
npm run test:unit

# Run only end-to-end tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
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
├── compose-parser.js    # Docker compose file parser
└── types.js            # Core data structures and enums

test/
├── setup.js            # Test setup configuration
├── unit/               # Unit tests
│   ├── compose-parser.test.js
│   ├── container.test.js
│   ├── index.test.js
│   └── quadlet-generator.test.js
└── e2e/                # End-to-end tests
    ├── container.e2e.test.js
    ├── podlet-js.e2e.test.js
    └── quadlet-generator.e2e.test.js
```

## Dependencies

### Runtime Dependencies
- `minimist`: Command line argument parsing
- `composerize`: Convert Docker run commands to docker-compose format

### Development Dependencies
- `jest`: Testing framework
- `@jest/globals`: Jest testing utilities
- `babel-jest`: Babel integration for Jest
- `@babel/core` & `@babel/preset-env`: ES6+ transpilation
- `fs-extra`: Enhanced file system operations for testing
- `tmp`: Temporary file and directory creation for tests

## License

MPL-2.0 (same as original Podlet)
