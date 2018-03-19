import * as webpack from 'webpack';
import * as UglifyJsPlugin from 'uglifyjs-webpack-plugin';

const config: webpack.Configuration = {
  entry: './src/index.ts',
  target: 'web',
  output: {
    filename: './smith.js',
  },
  module: {
    rules: [
      // all files with a '.ts' extension will be handled by 'ts-loader'
      { test: /\.ts$/, use: 'ts-loader' }
    ],
  },
  plugins: [
    new UglifyJsPlugin({ sourceMap: true, parallel: true })
  ],
  resolve: {
    // Add '.ts' as a resolvable extension.
    extensions: [ '.ts', '.js' ],
  },
  devtool: '#source-map',
  externals: {
    'd3': 'd3',
    'jquery': '$'
  },
};

export default config;
