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
export const getFiles = (
  root: string,
  ignoreFolders: string[],
  ignoreFiles: string[],
  deep: boolean,
) => {
  if (!existsSync(root)) return [];
  const fileList = deepReadDirSync(root, deep);
  return fileList.filter((file) => {
    const isPageComponent = TestPageComponent(file, ignoreFolders, ignoreFiles);
    const isLayoutComponent = TestLayoutComponent(file);
    if (deep) {
      return isPageComponent;
    }
    return isPageComponent && isLayoutComponent;
  });
};

// 判断哪些文件是页面组件
const TestPageComponent = (file: string, ignoreFolders: string[], ignoreFiles: string[]) => {
  if (typeof file !== 'string' || !Array.isArray(ignoreFolders)) {
    throw new Error('Invalid arguments: file should be a string and ignoreFolders an array.');
  }
  const PAGE_FILE_REGEX = /\.(jsx?|tsx?)$/; // 匹配 .js, .jsx, .ts, .tsx
  const TYPE_FILE_REGEX = /\.d\.ts$/; // 排除类型声明文件

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ignoreFoldersRegex = new RegExp(`(${ignoreFolders.map(escapeRegex).join('|')})\\/`);
  const ignoreFilesRegex = new RegExp(`(${ignoreFiles.map(escapeRegex).join('|')})$`);

  return (
    PAGE_FILE_REGEX.test(file) && // 文件扩展名符合页面组件
    !TYPE_FILE_REGEX.test(file) && // 排除类型声明文件
    !ignoreFilesRegex.test(file) && // 排除常见工具类文件
    !ignoreFoldersRegex.test(file) // 排除指定文件夹
  );
};

// 是否是layout组件
const TestLayoutComponent = (file: string) => {
  return /\/src\/layouts\/index/.test(file);
};

// 判断项目是否为ts项目
export const isTsProject = (root: string) => {
  return existsSync(path.join(root, 'tsconfig.json'));
};

// 判断是否存在router组件
export const isExistRouter = (filePaths: string[]) => tryPaths(filePaths).length > 0;

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

// 防抖
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  immediate: boolean = false,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };

    const shouldCallNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (shouldCallNow) {
      func(...args);
    }
  };
}

// 节流
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let lastTime: number = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      func(...args);
      lastTime = now;
    }
  };
}
