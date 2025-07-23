const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

export default {
  entry: './src/index.js',
  output: {
    filename: 'podletjs.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'PodletJS',
      type: 'umd'
    },
    globalObject: 'this'
  },
  plugins: [
    new NodePolyfillPlugin()
  ],
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  mode: 'production'
};