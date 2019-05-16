import * as path from 'path';
import * as interpret from 'interpret';
import * as rechoir from 'rechoir';
import findup from 'findup-sync';
import webpack from 'webpack';

export const defaultWebpackConfigPath = (cwd: string) => {
  const extensions = Object.keys(interpret.extensions);
  const defaultConfigFileNames = ['webpack.config', 'webpackfile'];
  const configFileRegExp = `(${defaultConfigFileNames.join(
    '|',
  )})(${extensions.join('|')})`;
  const configPath = findup(configFileRegExp, {
    cwd,
  });

  return configPath;
};

export const webpackConfig = (cwd: string, configPath?: string) => {
  const reslvedConfigPath = (() => {
    if (!configPath) {
      return defaultWebpackConfigPath(cwd);
    }
    if (path.isAbsolute(configPath)) {
      return path.resolve(configPath);
    }
    return path.resolve(cwd, configPath);
  })();

  // register module loaders
  rechoir.prepare(interpret.extensions, reslvedConfigPath);

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const config: { default: webpack.Configuration } = require(reslvedConfigPath);

  return config.default || config;
};
