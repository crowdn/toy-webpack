module.exports = {
  entry: './src/index.js',
  output: { path: './dist', filename: 'main.js' },
  module: {
    rules: [
      {
        test: /\.txt$/,
        exclude: /node_modules/,
        use: '../package/loaders/txt-loader',
      },
    ],
  },
};
