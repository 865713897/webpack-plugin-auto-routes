import {
  extractMetaFromContent,
  equalRouteMeta,
  setRouteMetaCache,
  readHeaderComments,
} from '../core/routeMeta.js';

export async function handleFileChange(filePath: string) {
  try {
    const headerComments = await readHeaderComments(filePath);
    const meta = extractMetaFromContent(headerComments, filePath);
    const shouldReload = !equalRouteMeta(filePath, meta);
    if (shouldReload) {
      setRouteMetaCache(filePath, meta);
    }
    return shouldReload;
  } catch (err) {
    return false;
  }
}
