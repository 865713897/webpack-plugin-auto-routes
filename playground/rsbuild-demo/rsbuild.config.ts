import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import AutoRoutesPlugin from 'webpack-plugin-auto-routes';

export default defineConfig({
  tools: {
    rspack: {
      plugins: [new AutoRoutesPlugin()],
    },
  },
  plugins: [pluginReact()],
});
