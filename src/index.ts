import { join, isAbsolute, normalize } from 'path';
import fs from 'fs';
import chokidar from 'chokidar';

import GenerateRoute from './generate.js';
import { debounce } from './utils.js';

import type { Compiler } from 'webpack';
import type { dirType } from './interfaces.js';

interface Options {
  dirs?: string | (string | dirType)[];
  moduleType?: 'jsx' | 'tsx';
}

type UpdateType = null | 'fileListChange' | 'fileMetaChange';

export default class WebpackPluginAutoRoutes {
  private output: string;
  private generator: GenerateRoute;

  constructor(options: Options = {}) {
    const { dirs, output, module } = resolveOptions(options);
    this.generator = new GenerateRoute({ dirs, resolvedPath: output });
    this.output = output;
    if (!fs.existsSync(module)) {
      fs.mkdirSync(module);
    }

    // 初次生成文件
    this.writeFile();

    // 监听文件
    this.watchFiles(dirs);
  }

  apply(compiler: Compiler) {
    compiler.options.resolve.alias = {
      ...(compiler.options.resolve.alias || {}),
      ['virtual-routes']: this.output,
    };

    compiler.hooks.watchRun.tapAsync(
      'WebpackPluginAutoRoutes',
      async (c, cb) => {
        // 在此处处理删除文件是为了避免编译报错
        const removedFiles = Array.from(c.removedFiles || []);
        if (removedFiles.length) {
          const hasWatchFile = removedFiles.some((file) =>
            this.generator.isWatchFile(file)
          );
          if (hasWatchFile) {
            await this.writeFile('fileListChange');
          }
        }
        cb();
      }
    );
  }

  async writeFile(updateType: UpdateType = null) {
    const content = await this.generator.generateFileContent(updateType);
    fs.writeFileSync(this.output, content);
  }

  watchFiles(dirs: dirType[]) {
    const watcher = chokidar.watch(
      dirs.map(({ dir }) => dir),
      { ignoreInitial: true }
    );

    watcher.on(
      'all',
      debounce(async (event, filename) => {
        let updateType: UpdateType = null;
        if (this.generator.isWatchFile(filename)) {
          if (event === 'add') {
            updateType = 'fileListChange';
          }
        } else if (this.generator.isMetaFile(filename)) {
          if (event === 'unlink' || event === 'change') {
            updateType = 'fileMetaChange';
            this.generator.clearMetaCache(filename);
          }
        }
        if (updateType) {
          await this.writeFile(updateType);
        }
      }, 300)
    );
  }
}

function resolveOptions(opts: Options) {
  const { dirs, moduleType = 'tsx', ...rest } = opts;
  const cwd = process.cwd();
  let resolveDirs: dirType[] = [];

  if (!dirs) {
    resolveDirs = [{ dir: resolvePath(cwd, 'src/pages'), basePath: '' }];
  } else if (typeof dirs === 'string') {
    resolveDirs = [{ dir: resolvePath(cwd, dirs), basePath: '' }];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: resolvePath(cwd, d), basePath: '' };
      }
      return {
        dir: resolvePath(cwd, d.dir),
        basePath: d.basePath || '',
        pattern:
          typeof d.pattern === 'string' ? new RegExp(d.pattern) : d.pattern,
      };
    });
  }
  resolveDirs.push({
    dir: resolvePath(cwd, 'src/layouts'),
    basePath: '',
    isGlobal: true,
    pattern: /layouts[\\/]+index\.(jsx?|tsx?)$/,
  });
  const module = resolvePath(cwd, '.virtual_routes');
  const output = resolvePath(module, `index.${moduleType}`);

  return {
    dirs: resolveDirs,
    output,
    module,
    ...rest,
  };
}

function resolvePath(cwd: string, dir: string): string {
  // 统一使用 posix 格式路径
  const absolutePath = isAbsolute(dir)
    ? dir.split('\\').join('/')
    : join(cwd, dir);
  return absolutePath.split('\\').join('/'); // 转换为 posix 格式
}
