import { merge } from 'webpack-merge';
import common from './webpack.common.mjs';

export default merge(common, {
  mode: 'production',
  optimization: {
    splitChunks: {
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: -1,
        },
        vendors: {
          // 提取node_modules中的代码
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          minChunks: 1,
          chunks: 'initial', // 只提取初始化就能获取的模块，忽略异步调用
          minSize: 0,
          priority: -2,
        },
        commons: {
          // 提取页面公共代码
          name: 'commons',
          minChunks: 2,
          chunks: 'initial',
          minSize: 0,
        },
      },
    },
  },
});
