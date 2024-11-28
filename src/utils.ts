import path from 'path';
import { mkdir, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';

// 写入文件
export const writeToFileAsync = async (filePath: string, fileSuffix: string, content: string) => {
  try {
    await new Promise<void>((resolve, reject) => {
      mkdir(filePath, { recursive: true }, (err) => {
        if (err) {
          console.log(`failed to generate ==== ${fileSuffix}`);
          return reject(err);
        }
        const outputFile = path.join(filePath, fileSuffix);
        if (existsSync(outputFile)) {
          const oldContent = readFileSync(outputFile, 'utf-8');
          if (oldContent === content) return resolve();
        }
        writeFileSync(outputFile, content, 'utf-8');
        resolve();
      });
    });
  } catch (_) {
    console.log(`failed to generate ${fileSuffix}`);
  }
};

// 查找文件
export const deepReadDirSync = (root: string, deep: boolean) => {
  let fileList: string[] = [];
  const files = readdirSync(root);
  files.forEach((file) => {
    const absFilePath = path.join(root, file);
    if (statSync(absFilePath).isDirectory() && deep) {
      fileList = fileList.concat(deepReadDirSync(absFilePath, deep));
    } else {
      fileList.push(absFilePath);
    }
  });
  return fileList;
};

// 获取文件
export const getFiles = (root: string, excludeFolders: string[], deep: boolean) => {
  if (!existsSync(root)) return [];
  const fileList = deepReadDirSync(root, deep);
  return fileList.filter((file) => {
    const isPageComponent = TestPageComponent(file, excludeFolders);
    const isLayoutComponent = TestLayoutComponent(file);
    if (deep) {
      return isPageComponent;
    }
    return isPageComponent && isLayoutComponent;
  });
};

// 判断哪些文件是页面组件
const TestPageComponent = (file: string, excludeFolders: string[]) => {
  const fileRegex = /\.(j|t)sx?$/;
  const typeFileRegex = /.*\.d\.ts$/;
  const excludeRegex = new RegExp(`(${excludeFolders.join('|')})\\/`);

  return fileRegex.test(file) && !typeFileRegex.test(file) && !excludeRegex.test(file);
};

// 是否是layout组件
const TestLayoutComponent = (file: string) => {
  return /\/layouts\/index/.test(file);
};

// 判断项目是否为ts项目
export const isTsProject = (root: string) => {
  return existsSync(path.join(root, 'tsconfig.json'));
};

// 判断项目是否有layouts组件
export const hasLayoutComp = (root: string) => {
  return tryPaths([path.join(root, 'index.jsx'), path.join(root, 'index.tsx')]).length > 0;
};

// 判断项目是否有loading组件
export const hasLoadingComponent = (root: string) => {
  return tryPaths([path.join(root, 'index.jsx'), path.join(root, 'index.tsx')]).length > 0;
};

// 获取chunkName
export const getChunkName = (path: string) => {
  return (
    'src' +
    path
      .replace('..', '')
      .replace(/\.(j|t)sx?$/, '')
      .replace(/\//g, '__')
      .toLowerCase()
  );
};

// 获取有效路径
export const tryPaths = (paths: string[]) => {
  for (const path of paths) {
    if (existsSync(path)) return path;
  }
  return '';
};
