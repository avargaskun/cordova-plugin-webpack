const options = {
  webpack: {
    alias: 'w',
    describe: 'Passed to the webpack-cli or webpack-dev-server options',
  },
  livereload: {
    type: 'boolean' as const,
    alias: 'l',
    describe: 'Enables LiveReload (HMR)',
    default: false,
  },
  bail: {
    type: 'boolean' as const,
    alias: 'b',
    describe: 'Fails the build when errors are present in webpack result',
    default: false,
  },
};

export default options;
