import fsp from 'fs/promises';

import {
  extractMetaFromContent,
  equalRouteMeta,
  setRouteMetaCache,
} from '../core/routeMeta.js';

export async function handleFileChange(filePath: string) {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    const meta = extractMetaFromContent(content, filePath);
    const shouldReload = !equalRouteMeta(filePath, meta);
    if (shouldReload) {
      setRouteMetaCache(filePath, meta);
    }
    return shouldReload;
  } catch (err) {
    return false;
  }
}
