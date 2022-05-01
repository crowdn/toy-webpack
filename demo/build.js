const config = require('./webpack.config.js');
const ToyWebpack = require('../package/ToyWebpack');

const webpack = new ToyWebpack(config);
webpack.run(() => {
  console.log('finish');
}, console.error);
