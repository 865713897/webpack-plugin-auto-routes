import { normalizePath } from '../utils/index.js';
import { RouteMeta } from '../types/index.js';

export function simpleLayoutId(input: string, isGlobal: boolean): string {
  const id = `@@${isGlobal ? 'global' : input.split('/').pop()}-layout`;
  return id;
}

export function filePathToRoutePath(
  file: string,
  dir: string,
  basePath: string
): string {
  const relative = normalizePath(
    file.replace(dir, '').replace(/\.(jsx?|tsx?|vue)$/, '')
  );
  return normalizePath(`/${basePath}/${relative}`).replace(/\/index$/, '');
}

// 导出一个函数，用于连接父节点和子节点路由
export function linkParentChildRoutes(routesMap: Record<string, RouteMeta>) {
  const childRouteIds: string[] = [];

  Object.values(routesMap).forEach((route) => {
    if (route.parentId && routesMap[route.parentId]) {
      const parent = routesMap[route.parentId];
      route.path = route.path.replace(parent.path, '').replace(/^\//, '') || '';
      parent.children ??= [];
      parent.children.push(route);
      childRouteIds.push(route.id);
    }
  });

  // 删除嵌套后平级存在的子节点
  for (const id of childRouteIds) {
    delete routesMap[id];
  }
}

export function pruneEmptyLayouts(
  routesMap: Record<string, RouteMeta>,
  layoutIdMap: Record<string, string>
) {
  for (const key in layoutIdMap) {
    const layoutId = layoutIdMap[key];
    const route = routesMap[layoutId];
    if (route?.isLayout && (!route.children || route.children.length === 0)) {
      if (key !== 'global') delete routesMap[layoutId];
    }
  }
}
