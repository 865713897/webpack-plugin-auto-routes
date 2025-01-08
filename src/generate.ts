import { generateRouterTemplate } from './routeTemplate.js';
import { scanDirectory, parseRoutes } from './fileUtils.js';
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
  writeToDisk?: boolean; // 是否写入磁盘
  ignoredNames?: string[]; // 忽略的文件名
}

export default class GenerateRoute {
  private resolvedPath: string;
  private writeToDisk: boolean;
  private fileListCache: fileListType[] | null = null;
  private ignoredRegex: RegExp = null;
  private metaCache = new CacheManage();
  private dirs: dirType[];

  constructor(opts: GenerateRouteOptions) {
    const { ignoredNames = [], resolvedPath, dirs, writeToDisk } = opts;
    this.resolvedPath = resolvedPath;
    this.ignoredRegex = new RegExp(
      `${[...DEFAULT_IGNORED_NAMES, ...ignoredNames].join('|')}`
    );
    this.dirs = dirs;
    this.writeToDisk = writeToDisk;
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
      let files = await scanDirectory(dir);
      files = files.filter(
        (filename) =>
          this.isPageFile(filename) &&
          this.isNotIgnoredFile(filename) &&
          (!pattern || pattern.test(filename))
      );
      fileList.push({ dir, basePath, files, isGlobal });
    }
    this.fileListCache = fileList;

    return fileList;
  }

  // 清除meta缓存
  clearMetaCache(key: null | string | string[] = null) {
    if (Array.isArray(key)) {
      key.forEach((k) => this.metaCache.clear(k));
    } else {
      this.metaCache.clear(key);
    }
  }

  // 是否为React页面文件
  isPageFile(filename: string) {
    return (
      PAGE_FILE_REGEX.test(filename) && // 文件扩展名符合页面组件
      !TYPE_FILE_REGEX.test(filename) // 排除类型声明文件
    );
  }

  // 是否为忽略文件
  isNotIgnoredFile(filename: string) {
    return !this.ignoredRegex.test(filename);
  }

  // 是否为可监控文件
  isWatchFile(filename: string) {
    return (
      this.dirs.some(({ dir }) => filename.startsWith(dir)) &&
      this.isPageFile(filename) &&
      this.isNotIgnoredFile(filename)
    );
  }

  // 是否为页面源文件
  isMetaFile(filename: string) {
    return META_FILE_REGEX.test(filename);
  }
}
