import { merge } from 'webpack-merge';
import common from './webpack.common.mjs';

export default merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  stats: 'errors-only',
  devServer: {
    port: 3000,
    hot: true,
    open: false,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
      },
    ],
  },
});
