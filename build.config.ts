import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts'],
  outDir: 'lib',
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
});
