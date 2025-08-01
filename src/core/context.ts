import fg from 'fast-glob';
import pm from 'picomatch';

import { DefaultIgnoreNames } from '../constant.js';
import { getResolver } from '../resolver/index.js';
import { getRouteMetaFromFiles } from './routeMeta.js';
import { toCaseInsensitiveGlob } from '../utils/index.js';

import { DirType, FileItem, ResolverType, Framework } from '../types/index.js';

interface IContext {
  dirs: DirType[];
  framework: Framework;
  generatePath: string;
}

export default class Context {
  private dirs: DirType[];
  private generatePath: string;
  private ignore: string[];
  private fileListCache: FileItem[] = [];
  private resolver: ResolverType;
  constructor(opts: IContext) {
    this.dirs = opts.dirs;
    this.generatePath = opts.generatePath;
    this.resolver = getResolver(opts.framework);
    this.ignore = DefaultIgnoreNames.reduce(
      (acc, cur) => {
        acc = acc.concat([
          `**/${toCaseInsensitiveGlob(cur)}.*`,
          `**/${toCaseInsensitiveGlob(cur)}/**`,
        ]);
        return acc;
      },
      ['**/*.d.ts']
    );
  }

  // 初始化时获取文件列表
  async getInitialFileList() {
    const { suffix } = this.resolver;
    let fileList: FileItem[] = [];
    let filePaths: string[] = [];

    for (const { dir, basePath, pattern, isGlobal } of this.dirs) {
      const source = `${isGlobal ? 'index' : '**/*'}.@(${suffix})`;
      let files = await fg(source, {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        ignore: this.ignore,
      });

      if (pattern && pattern instanceof RegExp) {
        files = files.filter((file) => pattern.test(file));
      }

      fileList.push({ dir, basePath, files, isGlobal });
      filePaths = filePaths.concat(files);
    }

    await getRouteMetaFromFiles(filePaths);
    this.fileListCache = fileList;
  }

  getFileList(): FileItem[] {
    return this.fileListCache;
  }

  async generateFileContent() {
    const { getResolvedRoutes, generateTemplate } = this.resolver;
    const fileList = this.getFileList();

    const routesString = await getResolvedRoutes({
      fileList,
      generatePath: this.generatePath,
    });

    const template = generateTemplate(routesString);

    return template;
  }

  // 增加文件（文件变动监听时调用）
  addFile(file: string) {
    const dirItem = this.dirs.find(({ dir }) => file.startsWith(dir));
    if (!dirItem) return;

    const cacheItem = this.fileListCache.find(
      (item) => item.dir === dirItem.dir && item.basePath === dirItem.basePath
    );

    if (cacheItem && !cacheItem.files.includes(file)) {
      cacheItem.files.push(file);
    }
  }

  // 删除文件（文件变动监听时调用）
  removeFile(file: string) {
    for (const fileGroup of this.fileListCache) {
      const index = fileGroup.files.indexOf(file);
      if (index !== -1) {
        fileGroup.files.splice(index, 1);
      }
    }
  }

  isWatchFile(filename: string) {
    const { isPageFile, isGlobalLayoutFile } = this.resolver;
    const belongDirs = this.dirs.some(
      ({ dir, isGlobal, pattern }) =>
        filename.startsWith(dir) &&
        (!pattern || (pattern instanceof RegExp && pattern.test(filename))) &&
        (!isGlobal || (isGlobal && isGlobalLayoutFile(filename)))
    );
    const isPage = isPageFile(filename);
    const isIgnore = this.isIgnoreFile(filename);

    return belongDirs && isPage && !isIgnore;
  }

  isIgnoreFile(filename: string) {
    return this.ignore.some((item) => {
      const isMatch = pm(item);
      return isMatch(filename);
    });
  }
}
