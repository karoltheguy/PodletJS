# Unit Tests

This directory contains comprehensive unit tests for the PodletJS project.

## Test Files

### `quadlet-generator.test.js`
Comprehensive unit tests for the `QuadletGenerator` class covering:

### `container.test.js`
Tests for the `Container` class covering basic configuration and validation.

### `compose-parser.test.js`
Tests for the `ComposeParser` class covering Docker Compose YAML parsing.

### `index.test.js`
Tests for the main `PodletJS` class covering the public API.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/unit/quadlet-generator.test.js

# Run with coverage
npm test -- --coverage
```
