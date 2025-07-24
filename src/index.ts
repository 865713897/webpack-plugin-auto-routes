import { join } from 'path';
import fs from 'fs';
import chokidar from 'chokidar';

import RouteContext from './core/context.js';
import { clearRouteMetaCache } from './core/routeMeta.js';
import { tryPaths, unifiedUnixPathStyle } from './utils/index.js';
import { FrameworkEnum } from './constant.js';

import type { Compiler } from 'webpack';
import type { DirType } from './types/index.js';

interface Options {
  dirs?: string | (string | DirType)[];
}

export default class WebpackPluginAutoRoutes {
  private output: string;
  private ctx: RouteContext;
  private coldStart: boolean;

  constructor(options: Options = {}) {
    const { dirs, output, cwd } = resolveOptions(options);
    this.coldStart = true;
    this.output = output;
    this.ctx = new RouteContext({ dirs, generatePath: output });

    const framework = detectFrameworkFromPackageJson(cwd);
    if (framework !== 'unknown') {
      this.ctx.setFramework(framework);
    } else {
      throw new Error(
        '[webpack-plugin-auto-routes] Unable to parse framework from package.json file'
      );
    }

    this.startWatchFiles(dirs);
  }

  apply(compiler: Compiler) {
    compiler.options.resolve.alias = {
      ...(compiler.options.resolve.alias || {}),
      ['virtual-routes']: this.output,
    };

    compiler.hooks.beforeCompile.tapAsync(
      'WebpackPluginAutoRoutes',
      async (_, cb) => {
        if (this.coldStart) {
          await this.ctx.getInitialFileList();
          await this.load();
          this.coldStart = false;
        }
        cb();
      }
    );

    compiler.hooks.watchRun.tapAsync(
      'WebpackPluginAutoRoutes',
      async (c, cb) => {
        // 处理删除文件，避免报错提示
        const removedFiles = Array.from(c?.removedFiles || []);
        let shouldReload = false;
        removedFiles.forEach((filename) => {
          const unixFilename = unifiedUnixPathStyle(filename);
          if (this.ctx.isWatchFile(unixFilename)) {
            shouldReload = true;
            this.ctx.removeFile(unixFilename);
          }
        });
        if (shouldReload) {
          await this.load();
        }
        cb();
      }
    );
  }

  async load() {
    const content = await this.ctx.generateFileContent();

    fs.writeFileSync(this.output, content);
  }

  startWatchFiles(dirs: DirType[]) {
    const watcher = chokidar.watch(
      dirs.map(({ dir }) => dir),
      { ignoreInitial: true }
    );

    watcher.on('all', async (event, filename) => {
      const unixFilename = unifiedUnixPathStyle(filename);

      if (!this.ctx.isWatchFile(unixFilename)) return;

      const handlers: Record<string, () => void> = {
        add: () => this.ctx.addFile(unixFilename),
        // unlink: () => this.ctx.removeFile(unixFilename),
        change: () => clearRouteMetaCache(unixFilename),
      };

      const handler = handlers[event];
      if (handler) {
        handler();
        await this.load();
      }
    });
  }
}

function resolveOptions(opts: Options) {
  const { dirs } = opts;
  const cwd = process.cwd();
  let resolveDirs: DirType[] = [];

  if (!dirs) {
    resolveDirs = [
      { dir: unifiedUnixPathStyle(join(cwd, 'src/pages')), basePath: '' },
    ];
  } else if (typeof dirs === 'string') {
    resolveDirs = [
      { dir: unifiedUnixPathStyle(join(cwd, dirs)), basePath: '' },
    ];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: unifiedUnixPathStyle(join(cwd, d)), basePath: '' };
      }
      return {
        dir: unifiedUnixPathStyle(join(cwd, d.dir)),
        basePath: d.basePath || '',
        pattern:
          typeof d.pattern === 'string' ? new RegExp(d.pattern) : d.pattern,
      };
    });
  }
  resolveDirs.push({
    dir: unifiedUnixPathStyle(join(cwd, 'src/layouts')),
    basePath: '',
    isGlobal: true,
    pattern: /layouts[\\/]+index\.(jsx?|tsx?)$/,
  });
  const hasTsConfig = tryPaths([join(cwd, 'tsconfig.json')]);
  const outputDir = unifiedUnixPathStyle(join(cwd, '.virtual_routes'));
  const output = unifiedUnixPathStyle(
    join(cwd, '.virtual_routes', `index.${hasTsConfig ? 'ts' : 'js'}`)
  );

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  } catch (e) {}

  return {
    cwd,
    dirs: resolveDirs,
    output,
  };
}

function detectFrameworkFromPackageJson(cwd: string) {
  try {
    const pkgPath = join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps.react) return FrameworkEnum.REACT;
    if (deps.vue) return FrameworkEnum.VUE;

    return 'unknown';
  } catch (e) {
    return 'unknown';
  }
}
