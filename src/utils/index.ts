import fs from 'fs';

// 导出一个名为 normalizePath 的函数，该函数用于规范化路径字符串
export function normalizePath(path: string) {
  return path.replace(/\/+/g, '/');
}

// 获取相对路径
export function getRelativePath(from: string, to: string) {
  if (from === to) return '';

  const fromParts = from.split('/');
  const toParts = to.split('/');

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

// 统一文件路径风格
export function unifiedUnixPathStyle(p: string) {
  return p.replace(/\\/g, '/');
}

// 判断路径是否存在
export function tryPaths(paths: string[]) {
  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

export function toCaseInsensitiveGlob(str: string) {
  return str
    .split('')
    .map((c) => {
      const lower = c.toLowerCase();
      const upper = c.toUpperCase();
      return lower === upper ? c : `[${lower}${upper}]`;
    })
    .join('') + '?(s|S)';
}
