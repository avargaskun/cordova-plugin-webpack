import 'source-map-support/register';
import path from 'path';
import yargs from 'yargs';
import yargsUnparser from 'yargs-unparser';
import is from '@sindresorhus/is';
import webpack from 'webpack';
import { Context } from './types';
// eslint-disable-next-line import/no-named-as-default
import options from './options';
import { createArguments, getVersion } from './utils/yargsHelpers';

module.exports = async (ctx: Context) => {
  const platforms = ['browser', 'android', 'ios'] as const;
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

  if (pluginArgv.livereload) {
    return;
  }

  const webpackYargs = yargs(
    yargsUnparser(
      createArguments(is.object(pluginArgv.webpack) ? pluginArgv.webpack : {}),
    ),
  );
  const webpackArgv = webpackYargs
    .options(webpack.cli.getArguments()) // set webpack yargs options
    .version(getVersion()).argv;

  try {
    const webpackConfigPath = path.resolve(
      ctx.opts.projectRoot,
      (webpackArgv.config as string) || 'webpack.config.js',
    );
    const webpackConfig = require(webpackConfigPath);

    const compiler = webpack(webpackConfig);

    if (!compiler) {
      throw new Error('Webpack compiler could not be created.');
    }

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          console.error(err.stack || err);
          if ((err as any).details) {
            console.error((err as any).details);
          }
          return reject(err);
        }

        if (!stats) {
          return reject(new Error('Webpack compilation failed without statistics.'));
        }

        if (stats.hasErrors()) {
          process.stdout.write(stats.toString({
            colors: true,
            all: false,
            errors: true,
            errorDetails: true,
          }) + '\n');

          return reject(new Error('Webpack compilation failed with errors.'));
        }

        if (stats.hasWarnings()) {
          process.stdout.write(stats.toString({
            colors: true,
            all: false,
            warnings: true,
          }) + '\n');
        }

        process.stdout.write(stats.toString({
          colors: true,
          all: false,
          assets: true,
          timings: true,
          version: true,
        }) + '\n');

        resolve();
      });
    });
  } catch (error) {
    console.error(error);
    // To match original --bail behavior
    if (pluginArgv.bail) {
      process.exit(1);
    }
  }
};
