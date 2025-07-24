import fg from 'fast-glob';
import fs from 'fs';

import { DefaultIgnoreNames, FrameworkEnum } from '../constant.js';
import { getResolvedRoutes } from './parse.js';
import { getResolver } from '../resolver/index.js';
import { getRouteMetaFromFiles } from './routeMeta.js';

import { DirType, FileItem } from '../types/index.js';

interface IContext {
  dirs: DirType[];
  generatePath: string;
}

export default class Context {
  private dirs: DirType[];
  private generatePath: string;
  private ignore: string[];
  private fileListCache: FileItem[] = [];
  private framework: FrameworkEnum;
  resolver: {
    suffix: string;
    generateTemplate: (input: string) => string;
  };
  constructor(opts: IContext) {
    this.dirs = opts.dirs;
    this.generatePath = opts.generatePath;

    this.ignore = DefaultIgnoreNames.reduce((acc, cur) => {
      acc.push(...[`**/${cur}?(s).*`, `**/${cur}?(s)/**`]);
      return acc;
    }, []);
    this.ignore.push('**/*.d.ts');
  }

  // 初始化时获取文件列表
  async getInitialFileList() {
    if (!this.resolver) {
      return;
    }
    const { suffix } = this.resolver;
    let fileList: FileItem[] = [];
    let filePaths: string[] = [];

    for (const { dir, basePath, pattern, isGlobal } of this.dirs) {
      let files = await fg(`**/*.@(${suffix})`, {
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
    // if (!this.resolver) {

    // }
    const { generateTemplate } = this.resolver;
    const fileList = this.getFileList();

    const routesString = await getResolvedRoutes(this.framework, {
      fileList,
      generatePath: this.generatePath,
    });

    const template = generateTemplate(routesString);

    return template;
  }

  setFramework(framework: FrameworkEnum) {
    this.framework = framework;
    this.resolver = getResolver(framework);
  }

  // ✅ 增加文件（文件变动监听时调用）
  addFile(file: string) {
    const dirItem = this.dirs.find(({ dir }) => file.startsWith(dir));
    if (!dirItem) return;

    const { dir, basePath, pattern } = dirItem;

    const cacheItem = this.fileListCache.find(
      (item) =>
        item.dir === dir &&
        item.basePath === basePath &&
        (!pattern || (pattern instanceof RegExp && pattern.test(file)))
    );

    if (cacheItem && !cacheItem.files.includes(file)) {
      cacheItem.files.push(file);
    }
  }

  // ✅ 删除文件（文件变动监听时调用）
  removeFile(file: string) {
    for (const fileGroup of this.fileListCache) {
      const index = fileGroup.files.indexOf(file);
      if (index !== -1) {
        fileGroup.files.splice(index, 1);
      }
    }
  }

  isWatchFile(filename: string) {
    return (
      this.dirs.some(({ dir }) => filename.startsWith(dir)) &&
      this.isPageFile(filename) &&
      !this.isIgnoreFile(filename)
    );
  }

  isPageFile(filename: string) {
    const pageFileRegexp =
      this.framework === FrameworkEnum.REACT ? /.(j|t)sx?$/ : /.vue$/;
    return (
      pageFileRegexp.test(filename) && // 文件扩展名符合页面组件
      !/\.d\.ts$/.test(filename) // 排除类型声明文件
    );
  }

  isIgnoreFile(filename: string) {
    return DefaultIgnoreNames.some((pattern) =>
      new RegExp(pattern).test(filename)
    );
  }
}
