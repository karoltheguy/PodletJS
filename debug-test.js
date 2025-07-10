import { DockerRunParser } from './src/docker-run-parser.js';

// Create a test parser with debug methods
class DebugParser extends DockerRunParser {
  _looksLikeImageName(arg) {
    const result = super._looksLikeImageName(arg);
    console.log(`_looksLikeImageName(${arg}) = ${result}`);
    return result;
  }
  
  _looksLikeFlagValue(arg, args, argIndex) {
    console.log(`_looksLikeFlagValue(${arg}, [${args.join(', ')}], ${argIndex})`);
    const result = super._looksLikeFlagValue(arg, args, argIndex);
    console.log(`_looksLikeFlagValue result: ${result}`);
    return result;
  }
}

const parser = new DebugParser();
const command = 'docker run --unknown-flag value nginx';
console.log('Parsing:', command);

const container = parser.parse(command);
console.log('Final result:');
console.log('podmanArgs:', container.podmanArgs);
console.log('image:', container.image);
console.log('exec:', container.exec);
