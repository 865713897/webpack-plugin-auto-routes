import { join } from 'path';
import fs from 'fs';
import chokidar from 'chokidar';

import RouteContext from './core/context.js';
import { clearRouteMetaCache } from './core/routeMeta.js';
import { tryPaths, unifiedUnixPathStyle, isEnumValue } from './utils/index.js';
import { handleFileChange } from './utils/handleFileChange.js';
import { detectFrameworkFromPackageJson } from './utils/detectFramework.js';
import { debounce } from './utils/debounce.js';
import { frameworkMap, frameworkList } from './constant.js';

import type { Compiler } from 'webpack';
import type { DirType, Framework } from './types/index.js';

interface Options {
  dirs?: string | (string | DirType)[];
  framework?: Framework;
}

export default class WebpackPluginAutoRoutes {
  private output: string;
  private ctx: RouteContext;
  private coldStart: boolean;
  private addFiles = new Set<string>();
  private changeFiles = new Set<string>();

  constructor(options: Options = {}) {
    const { dirs, output, cwd } = resolveOptions(options);
    this.coldStart = true;
    this.output = output;

    const framework = options.framework || detectFrameworkFromPackageJson(cwd);
    if (!isEnumValue(frameworkMap, framework)) {
      throw new Error(
        framework === 'unknown'
          ? '[webpack-plugin-auto-routes] Cannot detect framework from package.json, please set framework manually'
          : `[webpack-plugin-auto-routes] framework must be one of ${frameworkList.join(
              '|'
            )}, but got ${framework}`
      );
    }

    this.ctx = new RouteContext({ dirs, generatePath: output, framework });
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
            clearRouteMetaCache(unixFilename);
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
      {
        ignoreInitial: true,
      }
    );

    const debounceFlush = debounce(async () => {
      let shouldReload = false;
      for (const file of Array.from(this.addFiles)) {
        this.ctx.addFile(file);
        shouldReload = true;
      }
      for (const file of Array.from(this.changeFiles)) {
        if (await handleFileChange(file)) {
          shouldReload = true;
        }
      }

      this.addFiles.clear();
      this.changeFiles.clear();
      if (shouldReload) {
        await this.load();
      }
    }, 300);

    watcher.on('all', async (event, filename) => {
      const unixFilename = unifiedUnixPathStyle(filename);
      if (!this.ctx.isWatchFile(unixFilename)) return;

      const handlers: Record<string, () => void> = {
        add: () => this.addFiles.add(unixFilename),
        change: () => this.changeFiles.add(unixFilename),
      };
      const handler = handlers[event];
      if (handler) {
        handler();
        debounceFlush();
      }
    });
  }
}

function normalizeDirEntry(entry: string | DirType, cwd: string): DirType {
  if (typeof entry === 'string') {
    return {
      dir: unifiedUnixPathStyle(join(cwd, entry)),
      basePath: '',
    };
  }
  return {
    dir: unifiedUnixPathStyle(join(cwd, entry.dir)),
    basePath: entry.basePath || '',
    pattern:
      typeof entry.pattern === 'string'
        ? new RegExp(entry.pattern)
        : entry.pattern,
  };
}

function resolveOptions(opts: Options) {
  const { dirs } = opts;
  const cwd = process.cwd();
  let resolveDirs: DirType[] = [];
  resolveDirs = (
    Array.isArray(dirs)
      ? dirs
      : typeof dirs === 'string'
      ? [dirs]
      : ['src/pages']
  ).map((entry) => normalizeDirEntry(entry, cwd));
  resolveDirs.push({
    dir: unifiedUnixPathStyle(join(cwd, 'src/layouts')),
    basePath: '',
    isGlobal: true,
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
