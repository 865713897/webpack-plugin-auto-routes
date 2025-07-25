// generatePageFile.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置项
const config = {
  rootDir: path.resolve(__dirname, '../playground/rsbuild-demo/src/pages'),
  totalFiles: 4,
  maxDepth: 2,
  dirsPerLevel: 3,
  filePrefix: 'Page',
};

function generatePageContent(indexPath) {
  return [
    `// @route-meta: { "title": "${indexPath}" }`,
    '',
    'export default function Page() {',
    `  return <div>${indexPath}</div>;`,
    '}',
  ].join('\n');
}

async function createFilesRecursively(dir, depth, fileIndex, maxFiles) {
  if (fileIndex.count >= maxFiles) return;

  const pageFilePath = path.join(
    dir,
    `${config.filePrefix}${fileIndex.count}.tsx`
  );
  const relPath = path.relative(config.rootDir, pageFilePath);
  await fs.writeFile(
    pageFilePath,
    generatePageContent('/' + relPath.replace(/\\/g, '/'))
  );
  fileIndex.count++;

  if (depth > config.maxDepth) return;

  for (let i = 0; i < config.dirsPerLevel; i++) {
    if (fileIndex.count >= maxFiles) break;

    const subDir = path.join(dir, `sub${depth}_${i}`);
    await fs.mkdir(subDir, { recursive: true });
    await createFilesRecursively(subDir, depth + 1, fileIndex, maxFiles);
  }
}

async function main() {
  console.log('🛠️ 开始生成页面文件...');

  // 删除并重建根目录
  try {
    await fs.rm(config.rootDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('⚠️ 删除失败（可能文件夹不存在）：', e.message);
  }

  await fs.mkdir(config.rootDir, { recursive: true });

  const fileIndex = { count: 0 };
  await createFilesRecursively(config.rootDir, 1, fileIndex, config.totalFiles);

  console.log(`✅ 生成完成，总共生成了 ${fileIndex.count} 个页面文件`);
}

main().catch((err) => {
  console.error('❌ 出错了：', err);
  process.exit(1);
});
