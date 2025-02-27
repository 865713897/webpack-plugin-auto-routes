import fg from 'fast-glob';
import { generateRouterTemplate } from './routeTemplate.js';
import { parseRoutes } from './fileUtils.js';
import CacheManage from './cacheManage.js';
import {
  PAGE_FILE_REGEX,
  TYPE_FILE_REGEX,
  META_FILE_REGEX,
  DEFAULT_IGNORED_NAMES,
} from './constant.js';
import type { dirType, fileListType } from './interfaces.js';

export interface GenerateRouteOptions {
  dirs: dirType[];
  resolvedPath: string; // 文件使用路径
  ignoredNames?: string[]; // 忽略的文件名
}

export default class GenerateRoute {
  private resolvedPath: string;
  private fileListCache: fileListType[] | null = null;
  private ignoredRegex: RegExp = null;
  private metaCache = new CacheManage();
  private dirs: dirType[];
  private ignore: string[];

  constructor(opts: GenerateRouteOptions) {
    const { ignoredNames = [], resolvedPath, dirs } = opts;
    const ignore = ['**/node_modules/**', '**/*.d.ts'];
    for (const item of DEFAULT_IGNORED_NAMES) {
      ignore.push(...[`**/${item}?(s).*`, `**/${item}?(s)/**`]);
    }
    this.ignore = ignore;
    this.resolvedPath = resolvedPath;
    this.ignoredRegex = new RegExp(
      `${[...DEFAULT_IGNORED_NAMES, ...ignoredNames].join('|')}`
    );
    this.dirs = dirs;
  }

  // 生成文件内容
  async generateFileContent(
    updateType: null | 'fileListChange' | 'fileMetaChange'
  ) {
    const fileList = await this.getFileList(
      this.dirs,
      updateType !== 'fileListChange'
    );

    const { routes, routeComponents } = parseRoutes(
      fileList,
      this.resolvedPath,
      this.metaCache
    );

    const content = generateRouterTemplate(routes, routeComponents);

    return content;
  }

  // 获取文件列表
  async getFileList(dirs: dirType[], useCache: boolean) {
    if (useCache && this.fileListCache) {
      return this.fileListCache;
    }
    const fileList: fileListType[] = [];
    for (const { dir, basePath, pattern, isGlobal } of dirs) {
      let files = await fg('**/*.@(tsx|jsx|ts|js)', {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        ignore: this.ignore,
      });
      if (pattern) {
        files = files.filter((file) => pattern.test(file));
      }
      fileList.push({ dir, basePath, files, isGlobal });
    }
    this.fileListCache = fileList;

    return fileList;
  }

  // 清除meta缓存
  clearMetaCache(key: null | string = null) {
    let newKey = key || '';
    newKey = newKey.replace(/\\/g, '/');
    this.metaCache.clear(newKey);
  }

  // 是否为React页面文件
  isPageFile(filename: string) {
    return PAGE_FILE_REGEX.test(filename) && !TYPE_FILE_REGEX.test(filename); // 文件扩展名符合页面组件
  }

  // 是否为忽略文件
  isNotIgnoredFile(filename: string) {
    return !this.ignoredRegex.test(filename);
  }

  // 是否为可监控文件
  isWatchFile(filename: string) {
    const name = filename.replace(/\\/g, '/');
    return (
      this.dirs.some(({ dir }) => name.startsWith(dir)) &&
      this.isPageFile(name) &&
      this.isNotIgnoredFile(name)
    );
  }

  // 是否为页面源文件
  isMetaFile(filename: string) {
    return META_FILE_REGEX.test(filename);
  }
}
