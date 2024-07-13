import { IAppData } from './index';
import { getFiles, isTsProject, writeToFileAsync, getChunkName } from './utils';

interface IRoute {
  path: string;
  name: string;
  component: string;
  routes?: IRoute[];
}

// 生成路由组件
export const generateRouterComponent = async (appData: IAppData) => {
  const isTs = isTsProject(appData.cwd);
  const routerMode = appData.routingMode === 'browser' ? 'BrowserRouter' : 'HashRouter';
  const fileSuffix = isTs ? 'index.tsx' : 'index.jsx';
  let content = [
    `import React, { useEffect, useState } from 'react';`,
    `import { ${routerMode} as Router, Route, Routes, Navigate } from 'react-router-dom';`,
    `import { getRoutes } from './routes';`,
    '',
    'export default function AppRouter() {',
    `  const [routes, setRoutes] = useState${isTs ? '<IRoute[]>' : ''}([]);`,
    '',
    '  useEffect(() => {',
    '    setRoutes(getRoutes());',
    '  }, []);',
    '',
    `  const renderRoutes = (routes${isTs ? ': IRoute[]' : ''}) => {`,
    '    return routes.map((route) => {',
    '      const { path, Component, children = [] } = route || {};',
    '      return (',
    '        <Route key={path} path={path} element={<Component />}>',
    '          {renderRoutes(children)}',
    '        </Route>',
    '      );',
    '    });',
    '  };',
    '',
    '  return (',
    '    <Router>',
    '      <Routes>',
    '        {renderRoutes(routes)}',
    `        <Route path="*" element={<Navigate to="${appData.indexPath}" />} />`,
    '      </Routes>',
    '    </Router>',
    '  );',
    '}',
    '',
  ];
  if (isTs) {
    content.splice(
      4,
      0,
      '\ninterface IRoute {\n  path: string;\n  name: string;\n  Component: React.FC;\n  children?: IRoute[];\n}',
    );
  }
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join('\n'));
};

// 生成路由文件
export const generateRoutesFile = async (appData: IAppData) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, hasLayout } = await getRoutes(appData);
  const componentType = isTs ? ': React.ComponentType<P>' : '';
  const lazyComponentWrapperType = isTs ? ': React.FC<P>' : '';
  const genericType = isTs ? '<P>' : '';
  let content = [
    `import React, { Suspense } from 'react';`,
    '',
    `function withLazyLoad${genericType}(LazyComponent${componentType}) {`,
    `  const lazyComponentWrapper${lazyComponentWrapperType} = (props) => (`,
    `    <Suspense fallback={<div>Loading...</div>}>`,
    `      <LazyComponent {...props} />`,
    `    </Suspense>`,
    `  );`,
    '',
    '  return lazyComponentWrapper;',
    '}',
    '',
    'export function getRoutes() {',
    `  const routes = [`,
    `    ${renderRoutes(routes, 1)}`,
    '  ];',
    '  return routes;',
    '}',
    '',
  ];
  if (hasLayout) {
    content.splice(1, 0, `import { Navigate } from 'react-router-dom';`);
  }
  if (isTs) {
    content.unshift('// @ts-nocheck');
  }
  const fileSuffix = isTs ? 'routes.tsx' : 'routes.jsx';
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join('\n'));
};

// 获取路由
const getRoutes = (appData: IAppData) => {
  return new Promise(
    (resolve: ({ routes, hasLayout }: { routes: IRoute[]; hasLayout: boolean }) => void) => {
      const files = getFiles(appData.absPagesPath, appData.excludeFolders, true);
      const layoutsFileList = getFiles(appData.absLayoutsPath, appData.excludeFolders, false);
      const routes = fileToRoutes(files, appData);
      const layoutRoutes = layoutsFileList.map((file) => {
        const componentPath = file.replace(appData.absSrcPath, '').replace(/\\/g, '/');
        return {
          path: '/',
          name: '@@global-layout',
          component: `..${componentPath}`,
          routes: [
            { path: '', name: 'redirect', component: `() => <Navigate to='/home' replace />` },
            ...routes,
          ],
        };
      });
      if (layoutRoutes.length) {
        resolve({ routes: layoutRoutes, hasLayout: true });
      } else {
        resolve({ routes, hasLayout: false });
      }
    },
  );
};

// 转换成路由
const fileToRoutes = (files: string[], appData: IAppData) => {
  const { absPagesPath, absSrcPath } = appData;
  return files.reduce((pre, file) => {
    const filePath = file
      .replace(absPagesPath, '')
      .replace(/\\/g, '/')
      .replace(/(\/index)?\.(j|t)sx?$/g, '')
      .toLowerCase();
    const name = filePath.replace(/\//g, '-').slice(1);
    const componentPath = file.replace(absSrcPath, '').replace(/\\/g, '/');
    if (filePath !== '') {
      pre.push({
        path: filePath,
        name,
        component: `..${componentPath}`,
      });
    }
    return pre;
  }, [] as IRoute[]);
};

// 渲染路由
const renderRoutes = (routes: IRoute[], level: number): any => {
  return routes
    .map((route) => {
      const { path, name, component, routes = [] } = route;
      const indent = ''.padStart((level + 1) * 2);
      const deeperIndent = ''.padStart((level + 2) * 2);
      const chunkName = getChunkName(component);
      let content = [
        `{`,
        `${deeperIndent}path: '${path}',`,
        `${deeperIndent}name: '${name}',`,
        `${deeperIndent}Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${component}'))),`,
        `${deeperIndent}children: [${renderRoutes(routes, level + 1)}]`,
        `${indent}}`,
      ];
      if (name === 'redirect') {
        content.splice(4, 1);
        content[3] = `${deeperIndent}Component: ${component},`;
      }
      return content.join('\n');
    })
    .join(',');
};
