const path = require('path');

function resolve(dir) {
  return path.join(__dirname, '..', dir)
}

// taken from https://medium.com/@vladimirtolstikov/how-to-merge-d-ts-typings-with-dts-bundle-and-webpack-e8903d699576
function DtsBundlePlugin() { }
DtsBundlePlugin.prototype.apply = function (compiler) {
  compiler.plugin('done', function () {
    var dts = require('dts-bundle');

    dts.bundle({
      name: '@chartwerk/base',
      main: 'src/index.d.ts',
      out: '../dist/index.d.ts',
      removeSource: true,
      outputAsModuleFolder: true // to use npm in-package typings
    });
  });
};

module.exports = {
  context: resolve('src'),
  entry: './index.ts',
  plugins: [
    new DtsBundlePlugin()
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader', options: { injectType: 'lazyStyleTag' } },
          'css-loader',
        ],
        exclude: /node_modules/
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: resolve('dist'),
    libraryTarget: 'umd',
    umdNamedDefine: true
  }
};
