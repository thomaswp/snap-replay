var path = require('path');
var webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const Dotenv = require("dotenv-webpack");
module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname) + '/src/js/main.js',
    output: {
        path: path.resolve(__dirname) + '/dist',
        filename: 'js/bundle.js'
    },
    devtool: 'eval',
    plugins: [
        new CopyPlugin({
          patterns: [
            { from: 'reveal.js/dist/theme/fonts/', to: 'css/reveal.js/dist/theme/fonts/', context: 'node_modules', toType: 'dir'},
            { from: 'reveal.js/dist/**/*.css', to: 'css/', context: 'node_modules'},
          ],
        }),
        new Dotenv({
          systemvars: true,
        }),
      ],
};