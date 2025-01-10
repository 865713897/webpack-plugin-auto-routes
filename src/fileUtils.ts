import { join, sep } from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import {
  PAGE_FILE_REGEX,
  ROUTE_PATH_REGEX,
  LAYOUT_FILE_REGEX,
  LAYOUT_ID,
  CWD,
} from './constant.js';
import CacheManage from './cacheManage.js';
import type { fileListType } from './interfaces.js';

export async function scanDirectory(directory: string): Promise<string[]> {
  const isExist = await fsp
    .access(directory)
    .then(() => true)
    .catch(() => false);
  if (!isExist) return [];

  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scanDirectory(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

// 解析路由文件
export function parseRoutes(
  fileList: fileListType[],
  resolvedPath: string,
  metaCache: CacheManage
): { routes: string[]; routeComponents: string[] } {
  const routes = [];
  const routeComponents = [];
  const layoutMap = new Map<string, string>();
  // let globalLayoutId = null;
  // step 1: 预处理Layout文件
  // 约定**/layout/index.(js|jsx|ts|tsx) | **/Layout.(js|jsx|ts|tsx) 为Layout文件
  for (const item of fileList) {
    const { dir, files, isGlobal } = item;
    for (const file of files) {
      if (LAYOUT_FILE_REGEX.test(file)) {
        const target = getDirTarget(dir, isGlobal);
        layoutMap.set(isGlobal ? 'global' : dir, target);
        break;
      }
    }
  }
  for (const item of fileList) {
    const { dir, basePath, files } = item;
    const layoutId = layoutMap.get(dir) || layoutMap.get('global') || null; // 优先使用局部Layout
    for (const file of files) {
      const routePath = filePathToRoutePath(file, dir, basePath);
      const routeId = routePath.replace(/\//g, '-') || 'index';
      const relativePath = getRelativePath(resolvedPath, file);
      const metaPath = file.replace(PAGE_FILE_REGEX, '.meta.json');

      const { requireLayout = true, ...rest } = metaCache.getOrInsertWith(
        metaPath,
        () => {
          if (fs.existsSync(metaPath)) {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              return JSON.parse(content);
            } catch {
              return {};
            }
          }
          return {};
        }
      );
      let metaData = {
        id: routeId,
        path: normalizePath('/' + routePath.replace('$', ':')), // 适配动态路由
        ...rest,
      };

      // 如果是Layout文件则不生成路由
      if (LAYOUT_FILE_REGEX.test(file)) {
        metaData.id = layoutId;
        metaData.isLayout = true;
      } else if (requireLayout && layoutId && metaData.parentId === undefined) {
        metaData.parentId = layoutId;
      }

      routeComponents.push(
        `      '${
          metaData.id
        }': withLazyLoad(React.lazy(() => import(/* webpackChunkName: '${getChunkName(
          file
        )}' */'${relativePath}')))`
      );

      routes.push(`'${metaData.id}':${JSON.stringify(metaData)}`);
    }
  }

  return { routes, routeComponents };
}

export function filePathToRoutePath(
  filePath: string,
  prefix: string,
  basePath: string
): string {
  return join('/', basePath, filePath.replace(prefix, ''))
    .replace(/\\/g, '/')
    .replace(ROUTE_PATH_REGEX, '')
    .slice(1)
    .replace(/([a-z])([A-Z])/g, '$1-$2') // 将驼峰式命名转换为连字符命名
    .toLowerCase();
}

export function getDirTarget(dir: string, isGlobal: boolean): string {
  return isGlobal ? LAYOUT_ID : `@@${dir.split(sep).pop()}-layout`;
}

export function normalizePath(path: string) {
  return path.replace(/\/+/g, '/');
}

export function getRelativePath(from: string, to: string) {
  if (from === to) return '';

  const fromParts = from.split(sep);
  const toParts = to.split(sep);

  let i = 0;
  while (
    i < Math.min(fromParts.length, toParts.length) &&
    fromParts[i] === toParts[i]
  ) {
    i++;
  }

  // 计算相对路径
  const upSteps = fromParts.length - i - 1;
  const downSteps = toParts.slice(i);

  // 生成相对路径
  let relativePath = '../'.repeat(upSteps);
  if (upSteps === 0) {
    relativePath = './';
  }
  relativePath += downSteps.join('/');

  return relativePath;
}

export function getChunkName(file: string) {
  const relativePath = file
    .replace(CWD, '')
    .replace(/\.(jsx?|tsx?)$/, '')
    .slice(1);
  const nameParts = relativePath.split(sep);
  const meaningfulParts = nameParts.slice(-2);
  let baseName = meaningfulParts.join('_');
  const hash = simpleHash(relativePath);
  baseName = `${baseName}_${hash}`;

  return baseName;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1e8; // 乘 31 累积并取模
  }
  return hash.toString(36); // 转为 36 进制字符串
}
