import path from 'path';
import { Compiler } from 'webpack';
import chokidar from 'chokidar';
import { generateRouterComponent, generateRoutesFile } from './core';
import { debounce } from './utils';

export type routingModeType = 'browser' | 'hash';

export interface IAutoRoutes {
  excludeFolders?: string[];
  routingMode?: routingModeType;
  onlyRoutes?: boolean;
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
  excludeFolders: string[];
  routingMode: 'browser' | 'hash';
  indexPath: string;
}

class WebpackPluginAutoRoutes {
  excludeFolders: string[] = [];
  routingMode: routingModeType = 'browser';
  indexPath = '';
  isTsComponent = false;
  hasLayouts = false;
  isDev = true;

  constructor(options: IAutoRoutes) {
    const {
      excludeFolders = ['components'],
      routingMode = 'browser',
      indexPath = '/index',
    } = options || {};
    this.excludeFolders = excludeFolders;
    this.routingMode = routingMode;
    this.indexPath = indexPath;
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterPlugins.tap('WebpackPluginAutoRoutes', () => {
      try {
        this.run();
      } catch (error) {
        console.error('WebpackPluginAutoRoutes failed', error);
      }
    });
  }

  run() {
    const cwd = process.cwd(); // 获取当前工作目录
    const appData = this.getAppData({ cwd }); // 获取数据
    const watchFileSuffix = ['js', 'jsx', 'ts', 'tsx', 'meta.json'];
    const watchChangeFileSuffix = ['meta.json'];
    const watcher = chokidar.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true,
    });
    watcher.on(
      'all',
      debounce((event, path) => {
        const isWatchFile = watchFileSuffix.some((suffix) => path.endsWith(suffix));
        const isWatchChangeFile = watchChangeFileSuffix.some((suffix) => path.endsWith(suffix));
        if ((event === 'add' || event === 'unlink') && isWatchFile) {
          generateRoutesFile(appData, false);
        } else if (event === 'change' && isWatchChangeFile) {
          generateRoutesFile(appData, true);
        }
      }, 300),
    );
    generateRouterComponent(appData); // 只生成1次
    generateRoutesFile(appData, false);
  }

  // 获取数据
  getAppData({ cwd }: Options): IAppData {
    // 执行命令获取数据
    const absSrcPath = path.resolve(cwd, 'src');
    const absPagesPath = path.resolve(cwd, 'src/pages');
    const absNodeModulesPath = path.resolve(cwd, 'node_modules');
    const absRouterPath = path.resolve(cwd, 'src/router');
    const absLayoutsPath = path.resolve(cwd, 'src/layouts');

    const paths = {
      cwd,
      absSrcPath,
      absPagesPath,
      absNodeModulesPath,
      absRouterPath,
      absLayoutsPath,
      excludeFolders: this.excludeFolders,
      routingMode: this.routingMode,
      indexPath: this.indexPath,
    };
    return paths;
  }
}

export default WebpackPluginAutoRoutes;
