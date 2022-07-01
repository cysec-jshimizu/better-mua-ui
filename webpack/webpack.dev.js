const { merge } = require('webpack-merge');
const conf = require('./webpack.config.js');

module.exports = merge(conf, {
    devtool: 'inline-cheap-source-map',
    mode: 'development'
});
