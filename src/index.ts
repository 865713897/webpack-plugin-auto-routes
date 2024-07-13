import path from 'path';
import { Compiler } from 'webpack';
import chokidar from 'chokidar';
import { generateRouterComponent, generateRoutesFile } from './core';

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
  onlyRoutes = false;
  indexPath = '';
  isTsComponent = false;
  hasLayouts = false;
  isDev = true;

  constructor(options: IAutoRoutes) {
    const {
      excludeFolders = ['components'],
      routingMode = 'browser',
      onlyRoutes = false,
      indexPath = '/index',
    } = options || {};
    this.excludeFolders = excludeFolders;
    this.routingMode = routingMode;
    this.onlyRoutes = onlyRoutes;
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
    const watcher = chokidar.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true,
    });
    watcher.on('all', (event) => {
      if (event === 'add' || event === 'unlink') {
        this.generateRoutes(appData);
      }
    });
    this.generateRoutes(appData);
  }

  generateRoutes(appData: IAppData) {
    if (!this.onlyRoutes) {
      generateRouterComponent(appData);
    }
    generateRoutesFile(appData);
  }

  // 获取数据
  getAppData({ cwd }: Options) {
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
