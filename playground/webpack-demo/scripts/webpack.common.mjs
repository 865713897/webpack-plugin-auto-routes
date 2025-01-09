import path from 'path';
// import { DefinePlugin } from 'webpack';
// import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import AutoRoutePlugin from 'webpack-plugin-auto-routes';

// interface WebpackDevServerConfiguration {
//   devServer?: DevServerConfiguration;
// }

// type WebpackConfiguration = Configuration & WebpackDevServerConfiguration;

const currentDir = path.join(process.cwd(), 'scripts');

const isDev = process.env.NODE_ENV === 'development';

const filename = isDev ? '[name].js' : 'static/js/[name].[chunkhash:8].js';

const baseConfig = {
  entry: path.resolve(currentDir, '../src/index.tsx'),
  output: {
    path: path.resolve(currentDir, '../dist'),
    filename,
    clean: true,
    publicPath: '/',
  },
  resolve: {
    alias: {
      '@': path.resolve(currentDir, '../src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [
        path.resolve(currentDir, 'webpack.common.ts'),
        path.resolve(currentDir, '../package.json'),
      ],
    },
    cacheDirectory: path.resolve(currentDir, '../node_modules/.webpack'),
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        use: 'swc-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(currentDir, '../public/index.html'),
      inject: true,
    }),
    new AutoRoutePlugin({ moduleType: 'tsx' }),
    // new DefinePlugin({
    //   'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // }),
  ].filter(Boolean),
};

export default baseConfig;
