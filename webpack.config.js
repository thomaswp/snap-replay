var path = require('path');
var webpack = require('webpack');
module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname) + '/src/js/main.js',
    output: {
        path: path.resolve(__dirname) + '/dist/js',
        filename: 'bundle.js'
    },
    devtool: 'eval',
};