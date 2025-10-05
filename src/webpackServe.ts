import 'source-map-support/register';
import path from 'path';
import fs from 'fs';
import glob from 'glob';
import yargs from 'yargs/yargs';
import yargsUnparser from 'yargs-unparser';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import WebpackInjectPlugin from 'webpack-inject-plugin';
import is from '@sindresorhus/is';
import express from 'express';
import createHTML from 'create-html';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import { Context } from './types';
// eslint-disable-next-line import/no-named-as-default
import options from './options';
import { defaultHost, defaultPort } from './utils/webpackHelpers';
import { createArguments, getVersion } from './utils/yargsHelpers';
import ConfigParser from './utils/ConfigParser';
import devServerOptions from './options/devServer';

module.exports = async (ctx: Context) => {
  const platforms = ['browser', 'android', 'ios'] as const;
  const targetPlatforms = platforms.filter((platform) =>
    ctx.opts.platforms!.includes(platform),
  );
  if (
    !platforms.some(
      (platform) => ctx.opts.platforms && ctx.opts.platforms.includes(platform),
    )
  ) {
    return;
  }

  if (!ctx.opts.options || !ctx.opts.options.argv) {
    return;
  }

  const pluginYargs = yargs(ctx.opts.options.argv);
  const pluginArgv = pluginYargs
    .options(options.plugin) // set cordova-plugin-webpack options
    .version(
      `${ctx.opts.plugin!.pluginInfo.id} ${
        ctx.opts.plugin!.pluginInfo.version
      }`,
    ).argv;

  if (!pluginArgv.livereload) {
    return;
  }

  const webpackYargs = yargs(
    yargsUnparser(
      createArguments(is.object(pluginArgv.webpack) ? pluginArgv.webpack : {}),
    ),
  );

  const webpackArgv = webpackYargs
    .options(webpack.cli.getArguments()) // set webpack yargs options
    .options(devServerOptions as any) // set webpack-dev-server yargs options
    .version(getVersion()).argv;

  const webpackConfig = require(path.resolve(
    (webpackArgv.config as string) || 'webpack.config.js',
  ));

  const devServerConfig = webpackConfig.devServer || {};

  const protocol = devServerConfig.https ? 'https' : 'http';
  const host =
    !devServerConfig.host || devServerConfig.host === 'localhost'
      ? defaultHost
      : devServerConfig.host;
  const port = await choosePort(host, devServerConfig.port || defaultPort);
  if (!port) {
    return;
  }
  const urls = prepareUrls(protocol, host, port);
  const defaultAccessHost = {
    android: '10.0.2.2',
    ios: 'localhost',
  };

  webpackConfig.mode = 'development';
  webpackConfig.plugins = [
    ...(webpackConfig.plugins || []),
    new WebpackInjectPlugin(() =>
      fs.readFileSync(path.join(__dirname, 'www/injectCSP.js'), 'utf8'),
    ),
    new WebpackInjectPlugin(() =>
      fs.readFileSync(
        path.join(__dirname, 'www/injectCordovaScript.js'),
        'utf8',
      ),
    ),
  ];

  const serverConfig: WebpackDevServer.Configuration = {
    static: {
      directory: path.join(ctx.opts.projectRoot, 'www'),
    },
    historyApiFallback: true,
    hot: true,
    ...devServerConfig,
    host,
    port,
    onBeforeSetupMiddleware: (devServer: WebpackDevServer) => {
      if (devServerConfig.onBeforeSetupMiddleware) {
        devServerConfig.onBeforeSetupMiddleware(devServer);
      }
      targetPlatforms.forEach((platform) => {
        devServer.app!.use(
          `/${platform}`,
          express.static(
            path.join(
              ctx.opts.projectRoot,
              'platforms',
              platform,
              'platform_www',
            ),
          ),
        );
      });
    },
  };

  targetPlatforms.forEach((platform) => {
    if (platform === 'browser') {
      const html = createHTML({
        head: `<meta http-equiv="refresh" content="0;URL=${urls.localUrlForBrowser}">`,
      });
      fs.writeFileSync(
        path.join(
          ctx.opts.projectRoot,
          'platforms',
          platform,
          'www/index.html',
        ),
        html,
      );
      return;
    }
    glob
      .sync(
        path.join(ctx.opts.projectRoot, 'platforms', platform, '**/config.xml'),
      )
      .forEach((configXmlPath) => {
        const configXml = new ConfigParser(configXmlPath);
        configXml.setElement('content', {
          src: `${protocol}://${
            urls.lanUrlForConfig || defaultAccessHost[platform]
          }:${port}`,
        });
        if (platform === 'ios') {
          configXml.setElement('allow-navigation', { href: '*' });
        }
        configXml.write();
      });
  });

  const compiler = webpack(webpackConfig);
  const server = new WebpackDevServer(serverConfig, compiler as any);

  const signals = ['SIGINT', 'SIGTERM'] as const;
  signals.forEach((signal) => {
    process.on(signal, () => {
      server.stop();
      process.exit();
    });
  });

  await server.start();
  console.log('Starting the development server...\n');
};
