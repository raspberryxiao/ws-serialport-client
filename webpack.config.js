const path = require('path');
const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const pkg = require('./package.json');
console.log(pkg.name);

module.exports = function webpackConfig (env = {}) {
  return {
    context: path.resolve(__dirname, 'src'),
    entry: {
      index: './index.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.min.js',
      library: 'ws-serialport-client',
      libraryTarget: 'umd',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          // exclude: /(node_modules|bower_components)/,
          use: [{
            loader: 'babel-loader',
          }]
        },
        {
          'test': /\.tsx?$/,
          use: [{
            loader: 'ts-loader',
          }],
          'exclude': [/node_modules/, nodeModulesPath]
        },
      ]
    },
  };
};
