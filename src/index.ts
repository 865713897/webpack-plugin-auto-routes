import path from 'path';
import { Compiler } from 'webpack';
import chokidar from 'chokidar';
import { generateRouterComponent, generateRoutesFile } from './core';
import { debounce, isExistRouter } from './utils';

export type modeType = 'browser' | 'hash';

export interface IAutoRoutes {
  context?: string;
  entry?: string;
  ignoreFolders?: string[];
  ignoreFiles?: string[];
  mode?: modeType;
  indexPath?: string;
}

export interface Options {
  cwd: string; // 当前工作目录
}

export interface IAppData {
  cwd: string;
  absSrcPath: string;
  absPagesPath: string;
  absRouterPath: string;
  absLayoutsPath: string;
  ignoreFolders: string[];
  ignoreFiles: string[];
  mode: modeType;
  indexPath: string;
}

class WebpackPluginAutoRoutes {
  context: string = '';
  entry: string = '';
  ignoreFolders: string[] = [];
  ignoreFiles: string[] = ['meta.json'];
  mode: modeType = 'browser';
  indexPath = '';
  isTsComponent = false;
  hasLayouts = false;
  isDev = true;

  constructor(options: IAutoRoutes = {}) {
    const defaultOptions = {
      context: '',
      entry: '',
      ignoreFolders:
        'components,service,services,utils,assets,styles,types,hooks,interfaces,api,constants,models'.split(
          ',',
        ),
      ignoreFiles:
        'const,service,services,utils,assets,styles,types,hooks,interfaces,api,constants,models'.split(
          ',',
        ),
      mode: 'browser' as modeType,
      indexPath: '/',
    };
    const { ignoreFolders: _ignoreFolders = [], ignoreFiles: _ignoreFiles = [], ...rest } = options;
    const { context, entry, ignoreFolders, ignoreFiles, mode, indexPath } = {
      ...defaultOptions,
      ...rest,
    };
    this.context = context;
    this.entry = entry;
    this.ignoreFolders = [...ignoreFolders, ..._ignoreFolders];
    this.ignoreFiles = [...ignoreFiles, ..._ignoreFiles];
    this.mode = mode;
    this.indexPath = indexPath;
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterPlugins.tap('WebpackPluginAutoRoutes', () => {
      try {
        this.run();
      } catch (error) {
        throw new Error(`WebpackPluginAutoRoutes failed, ${error}`);
      }
    });
  }

  private run() {
    const cwd = process.cwd(); // 获取当前工作目录
    const appData = this.getAppData({ cwd }); // 获取数据

    const watchFileSuffix = ['js', 'jsx', 'ts', 'tsx', 'meta.json'];
    const watcher = chokidar.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true,
    });

    watcher.on(
      'all',
      debounce((event: 'add' | 'unlink' | 'change', filePath: string) => {
        const isWatchFile = watchFileSuffix.some((suffix) => filePath.endsWith(suffix));
        if (isWatchFile) {
          if (['add', 'unlink'].includes(event)) {
            this.generate(appData);
          } else if (event === 'change' && filePath.endsWith('meta.json')) {
            this.generate(appData, true);
          }
        }
      }, 300),
    );

    this.generate(appData);
  }

  // 获取数据
  private getAppData({ cwd }: Options): IAppData {
    const resolveAppPath = (relativePath: string, base = cwd) => path.resolve(base, relativePath);
    // 执行命令获取数据
    const absSrcPath = resolveAppPath('src');
    const absNodeModulesPath = resolveAppPath('node_modules');
    const absRouterPath = resolveAppPath('src/router');
    const absLayoutsPath = resolveAppPath('src/layouts');
    let absPagesPath = resolveAppPath('src/pages');
    if (this.entry) {
      if (path.isAbsolute(this.entry)) {
        absPagesPath = this.entry;
      } else if (this.context) {
        absPagesPath = resolveAppPath(this.entry, this.context);
      } else {
        throw 'context is required when entry is not absolute!';
      }
    }
    const paths = {
      cwd,
      absSrcPath,
      absPagesPath,
      absNodeModulesPath,
      absRouterPath,
      absLayoutsPath,
      ignoreFolders: this.ignoreFolders,
      ignoreFiles: this.ignoreFiles,
      mode: this.mode,
      indexPath: this.indexPath,
    };
    return paths;
  }

  private generate(appData: IAppData, isMetaChange = false) {
    const routerComponentPaths = [
      path.resolve(appData.absRouterPath, 'index.tsx'),
      path.resolve(appData.absRouterPath, 'index.jsx'),
      path.resolve(appData.absRouterPath, 'index.js'),
      path.resolve(appData.absRouterPath, 'index.ts'),
    ];
    if (!isExistRouter(routerComponentPaths)) {
      generateRouterComponent(appData);
    }
    generateRoutesFile(appData, isMetaChange);
  }
}

export default WebpackPluginAutoRoutes;
