import fs from 'fs';
import { IAppData } from './index';
import { getFiles, isTsProject, writeToFileAsync, getChunkName, tryPaths } from './utils';

interface RouteConfig {
  id: string;
  parentId?: string;
  path: string;
  name: string;
  isLayout?: boolean;
  [key: string]: any;
}

type RoutesMap = Record<string, RouteConfig>;
type RouteComponentsMap = Record<string, string>;

const layoutId = '@@global-layout';
const fileCache: Record<string, string[]> = {};

// 生成路由组件
export const generateRouterComponent = async (appData: IAppData) => {
  const isTs = isTsProject(appData.cwd);
  const routerMode = appData.routingMode === 'browser' ? 'BrowserRouter' : 'HashRouter';
  const fileSuffix = isTs ? 'index.tsx' : 'index.jsx';
  let content = [
    `import React from 'react';`,
    `import { ${routerMode} as Router, Route, Routes, Navigate } from 'react-router-dom';`,
    `import { getRoutes } from './routes';`,
    '',
    'export default function AppRouter() {',
    `  const { routes, routeComponents } = getRoutes();`,
    '',
    `  const renderRoutes = () => {`,
    '    return Object.keys(routeComponents).map((key) => {',
    '      const { id, parentId, path, isLayout } = routes[key];',
    '      if (isLayout) return null;',
    '      const LayoutComponent = parentId ? routeComponents[parentId] : null;',
    '      const Component = routeComponents[id];',
    '      if (LayoutComponent) {',
    '        return (',
    '          <Route element={<LayoutComponent />} key={key}>',
    '            <Route key={id} path={path} element={<Component />} />',
    '          </Route>',
    '        );',
    '      }',
    '      return <Route key={id} path={path} element={<Component />} />;',
    '    });',
    '  };',
    '',
    '  return (',
    '    <Router>',
    '      <Routes>',
    '        {renderRoutes()}',
    `        <Route path="*" element={<Navigate to="${appData.indexPath}" />} />`,
    '      </Routes>',
    '    </Router>',
    '  );',
    '}',
    '',
  ];
  if (isTs) {
    content
      .splice(
        5,
        1,
        '  const { routes, routeComponents }: { routes: RoutesMap; routeComponents: RouteComponentsMap } = getRoutes();',
      )
      .splice(
        3,
        0,
        ...[
          '',
          'interface RouteConfig {',
          '  id: string;',
          '  parentId?: string;',
          '  path: string;',
          '  isLayout?: boolean;',
          '  [key: string]: any;',
          '}',
          '',
          'type RoutesMap = Record<string, RouteConfig>;',
          'type RouteComponentsMap = Record<string, React.ComponentType<any>>;',
        ],
      );
  }
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join('\n'), true);
};

// 生成路由文件
export const generateRoutesFile = async (appData: IAppData, useCache: boolean) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, routeComponents } = getRoutes(appData, useCache);
  let content = [
    '// this file is generated by webpack-plugin-auto-routes',
    '// do not change anytime!',
    `import React from 'react';`,
    '',
    'export function getRoutes() {',
    `  const routes = {${renderRoutes(routes)}};`,
    '  return {',
    '    routes,',
    '    routeComponents: {',
    `      ${renderRouteComponent(routeComponents)}`,
    '    },',
    '  };',
    '}',
    '',
  ];
  if (isTs) {
    content.unshift('// @ts-nocheck');
  }
  const fileSuffix = isTs ? 'routes.tsx' : 'routes.jsx';
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join('\n'));
};

// 获取路由
const getRoutes = (appData: IAppData, useCache: boolean) => {
  const { absPagesPath, absLayoutsPath, excludeFolders } = appData;
  const files = getFilesWithCache(absPagesPath, excludeFolders, true, useCache);
  const layoutFiles = getFilesWithCache(absLayoutsPath, excludeFolders, false, useCache);
  const hasLayout = layoutFiles.length > 0;
  return fileToRoutes([...files, ...layoutFiles], appData, hasLayout);
};

// 获取文件
const getFilesWithCache = (
  filesPath: string,
  excludeFolders: string[],
  deep: boolean,
  useCache: boolean,
) => {
  const cacheKey = `${filesPath}_${excludeFolders.join('_')}`;
  if (useCache && fileCache[cacheKey]) {
    return fileCache[cacheKey];
  }
  const files = getFiles(filesPath, excludeFolders, deep);
  fileCache[cacheKey] = files;
  return files;
};

// 转换成路由
const fileToRoutes = (files: string[], appData: IAppData, hasLayout: boolean) => {
  const { absPagesPath, absSrcPath, absLayoutsPath } = appData;
  return files.reduce(
    (pre, file) => {
      const isLayout = file.replace(/(\/index)?\.(j|t)sx?$/g, '') === absLayoutsPath;
      const path = isLayout
        ? '/'
        : file
            .replace(absPagesPath, '')
            .replace(/\\/g, '/')
            .replace(/(\/index)?\.(j|t)sx?$/g, '')
            .toLowerCase();
      const id = isLayout ? layoutId : path.replace(/\//g, '-').slice(1);
      const componentPath = file.replace(absSrcPath, '').replace(/\\/g, '/');
      let { requireLayout, ...rest } = getPageMeta(file);
      requireLayout = requireLayout ?? true;
      if (path !== '') {
        // 舍弃src/pages/index.(j|t)sx?;
        pre.routes[id] = {
          path,
          id,
          name: id,
          ...rest,
        };
        if (requireLayout && hasLayout && !isLayout) {
          pre.routes[id].parentId = layoutId;
        }
        if (isLayout) {
          pre.routes[id].isLayout = true;
        }
        pre.routeComponents[id] = `..${componentPath}`;
      }
      return pre;
    },
    { routes: {}, routeComponents: {} } as {
      routes: RoutesMap;
      routeComponents: RouteComponentsMap;
    },
  );
};

// 获取页面元数据
const getPageMeta = (file: string) => {
  // NOTE: 从.meta.json文件中获取
  const filePathWithoutExt = file
    .replace(/\\/g, '/')
    .replace(/\.(j|t)sx?$/g, '')
    .toLowerCase();
  const metaFilePath = tryPaths([`${filePathWithoutExt}.meta.json`]);
  if (metaFilePath) {
    try {
      const metaInfo = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'));
      return metaInfo;
    } catch (error) {
      return {};
    }
  }
  return {};
};

// 渲染路由
const renderRoutes = (routes: RoutesMap): string[] => {
  return Object.keys(routes).map((id) => {
    const route = routes[id];
    let content: string[] = [];
    for (const key in route) {
      let value = route[key];
      value = typeof value === 'string' ? `'${value}'` : value;
      content.push(`'${key}':${value}`);
    }
    return `'${id}':{${content.join(',')}}`;
  });
};

// 渲染路由组件
const renderRouteComponent = (routeComponents: RouteComponentsMap) => {
  return Object.keys(routeComponents)
    .map((key) => {
      const componentPath = routeComponents[key];
      const chunkName = getChunkName(componentPath);
      return `'${key}':React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${componentPath}'))`;
    })
    .join(',\n');
};
