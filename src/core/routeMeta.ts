import fps from 'fs/promises';

export interface RouteMeta {
  id?: string;
  parentId?: string | null;
  meta?: object; // TODO: 暂时用 object，后续改成具体类型
}

const routeMetaCache = new Map<string, RouteMeta>();

export function extractTag(
  content: string,
  tag: string,
  filePath: string
): any {
  const re = new RegExp(`@${tag}:\\s*(.+)`);
  const match = content.match(re);
  if (!match) return -1;

  const raw = match[1].trim();

  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (raw === 'undefined') return undefined;
  if (!isNaN(Number(raw))) return Number(raw);

  // 支持 JSON 对象解析（可选）
  if (
    (raw.startsWith('{') && raw.endsWith('}')) ||
    (raw.startsWith('[') && raw.endsWith(']'))
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn(
        `[webpack-plugin-auto-routes] failed to parse JSON in ${filePath}:`,
        raw
      );
      return -1;
    }
  }

  return raw;
}

type ValidatorFn = (raw: any) => boolean;

interface MetaSchemaItem {
  tag: string;
  validate?: ValidatorFn;
  parse?: (raw: any) => any;
  message?: string;
}

const META_SCHEMA: Record<keyof RouteMeta, MetaSchemaItem> = {
  id: {
    tag: 'route-id',
    validate: (val) => typeof val === 'string',
    message: 'must be a string',
  },
  parentId: {
    tag: 'route-parent-id',
    validate: (val) =>
      val === null || val === undefined || typeof val === 'string',
    message: 'must be a string or null',
  },
  meta: {
    tag: 'route-meta',
    validate: (val) => typeof val === 'object',
    message: 'must be an object',
  },
};

function extractMetaFromContent(content: string, filePath: string): RouteMeta {
  const meta: RouteMeta = {};

  for (const [key, { tag, validate, message }] of Object.entries(META_SCHEMA)) {
    const raw = extractTag(content, tag, filePath);
    if (raw === -1) continue;

    const isValid = validate ? validate(raw) : true;
    if (!isValid) {
      console.warn(
        `[webpack-plugin-auto-routes] ${filePath}: @${tag} format invalid: ${raw}, ${message}`
      );
      continue;
    }

    (meta as any)[key] = raw;
  }

  return meta;
}

export async function getRouteMetaFromFiles(
  filePaths: string[]
): Promise<Record<string, RouteMeta>> {
  const result: Record<string, RouteMeta> = {};
  await Promise.all(
    filePaths.map(async (filePath) => {
      if (routeMetaCache.has(filePath)) {
        result[filePath] = routeMetaCache.get(filePath)!;
        return;
      }

      try {
        const content = await fps.readFile(filePath, 'utf-8');
        const meta = extractMetaFromContent(content, filePath);
        routeMetaCache.set(filePath, meta);
        result[filePath] = meta;
      } catch (err) {
        console.warn(`[webpack-plugin-auto-routes] Failed to read ${filePath}:`, err);
      }
    })
  );

  return result;
}

export function clearRouteMetaCache(filePath?: string) {
  if (filePath) {
    routeMetaCache.delete(filePath);
  } else {
    routeMetaCache.clear();
  }
}
