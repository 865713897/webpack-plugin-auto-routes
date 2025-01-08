import { join, isAbsolute } from 'path';
import fs from 'fs-extra';
import chokidar from 'chokidar';

import GenerateRoute from './generate.js';
import { debounce } from './utils.js';

import type { Compiler } from 'webpack';
import type { dirType } from './interfaces.js';

interface Options {
  dirs?: string | (string | dirType)[];
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
          const removeMetaFiles = removedFiles.filter((file) =>
            this.generator.isMetaFile(file)
          );
          let updateType: UpdateType = null;
          if (removeMetaFiles.length) {
            updateType = 'fileMetaChange';
            this.generator.clearMetaCache(removeMetaFiles);
          }
          if (hasWatchFile) {
            updateType = 'fileListChange';
          }
          if (updateType) {
            await this.writeFile(updateType);
          }
          console.log('removedFiles');
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
      debounce((event, filename) => {
        if (
          !this.generator.isWatchFile(filename) &&
          !this.generator.isMetaFile(filename)
        ) {
          return;
        }
        console.log(event, 'event', filename);
        let updateType: UpdateType = null;
        if (event === 'add') {
          updateType = 'fileListChange';
        } else if (event === 'change' && this.generator.isMetaFile(filename)) {
          updateType = 'fileMetaChange';
          this.generator.clearMetaCache(filename);
        }
        if (updateType) {
          this.writeFile(updateType);
        }
      }, 300)
    );
  }
}

function resolveOptions(opts: Options) {
  const { dirs, ...rest } = opts;
  const cwd = process.cwd();
  let resolveDirs: dirType[] = [];

  if (!dirs) {
    resolveDirs = [{ dir: join(cwd, 'src/pages'), basePath: '' }];
  } else if (typeof dirs === 'string') {
    const dir = isAbsolute(dirs) ? dirs : join(cwd, dirs);
    resolveDirs = [{ dir, basePath: '' }];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: isAbsolute(d) ? d : join(cwd, d), basePath: '' };
      }
      return {
        dir: isAbsolute(d.dir) ? d.dir : join(cwd, d.dir),
        basePath: d.basePath || '',
        pattern: d.pattern,
      };
    });
  }
  resolveDirs.push({
    dir: join(cwd, 'src/layouts'),
    basePath: '',
    isGlobal: true,
  });

  const module = join(cwd, '.virtual_routes');
  const output = join(module, 'index.tsx');

  return {
    dirs: resolveDirs,
    output,
    module,
    ...rest,
  };
}
