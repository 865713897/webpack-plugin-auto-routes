import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import AutoRoutesPlugin from 'webpack-plugin-auto-routes';

export default defineConfig({
  tools: {
    rspack: {
      // watchOptions: {
      //   ignored: '',
      // },
      plugins: [new AutoRoutesPlugin()],
    },
  },
  plugins: [pluginReact()],
});
