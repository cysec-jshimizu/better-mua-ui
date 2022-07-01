const { merge } = require('webpack-merge');
const conf = require('./webpack.config.js');

module.exports = merge(conf, {
    mode: 'production'
});
