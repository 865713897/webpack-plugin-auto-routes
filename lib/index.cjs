'use strict';

const path = require('path');
const chokidar = require('chokidar');
const fs = require('fs');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const chokidar__default = /*#__PURE__*/_interopDefaultCompat(chokidar);

const writeToFileAsync = async (filePath, fileSuffix, content) => {
  try {
    await new Promise((resolve, reject) => {
      fs.mkdir(filePath, { recursive: true }, (err) => {
        if (err) {
          console.log(`failed to generate ==== ${fileSuffix}`);
          return reject(err);
        }
        const outputFile = path__default.join(filePath, fileSuffix);
        if (fs.existsSync(outputFile)) {
          const oldContent = fs.readFileSync(outputFile, "utf-8");
          if (oldContent === content)
            return resolve();
        }
        fs.writeFileSync(outputFile, content, "utf-8");
        resolve();
      });
    });
  } catch (_) {
    console.log(`failed to generate ${fileSuffix}`);
  }
};
const deepReadDirSync = (root, deep) => {
  let fileList = [];
  const files = fs.readdirSync(root);
  files.forEach((file) => {
    const absFilePath = path__default.join(root, file);
    if (fs.statSync(absFilePath).isDirectory() && deep) {
      fileList = fileList.concat(deepReadDirSync(absFilePath, deep));
    } else {
      fileList.push(absFilePath);
    }
  });
  return fileList;
};
const getFiles = (root, excludeFolders, deep) => {
  if (!fs.existsSync(root))
    return [];
  const fileList = deepReadDirSync(root, deep);
  return fileList.filter((file) => {
    const isPageComponent = TestPageComponent(file, excludeFolders);
    const isLayoutComponent = TestLayoutComponent(file);
    if (deep) {
      return isPageComponent;
    }
    return isPageComponent && isLayoutComponent;
  });
};
const TestPageComponent = (file, excludeFolders) => {
  const fileRegex = /\.(j|t)sx?$/;
  const typeFileRegex = /.*\.d\.ts$/;
  const excludeRegex = new RegExp(`(${excludeFolders.join("|")})\\/`);
  return fileRegex.test(file) && !typeFileRegex.test(file) && !excludeRegex.test(file);
};
const TestLayoutComponent = (file) => {
  return /\/layouts\/index/.test(file);
};
const isTsProject = (root) => {
  return fs.existsSync(path__default.join(root, "tsconfig.json"));
};
const hasLoadingComponent = (root) => {
  return tryPaths([path__default.join(root, "index.jsx"), path__default.join(root, "index.tsx")]).length > 0;
};
const getChunkName = (path2) => {
  return "src" + path2.replace("..", "").replace(/\.(j|t)sx?$/, "").replace(/\//g, "__").toLowerCase();
};
const tryPaths = (paths) => {
  for (const path2 of paths) {
    if (fs.existsSync(path2))
      return path2;
  }
  return "";
};

const generateRouterComponent = async (appData) => {
  const isTs = isTsProject(appData.cwd);
  const routerMode = appData.routingMode === "browser" ? "BrowserRouter" : "HashRouter";
  const fileSuffix = isTs ? "index.tsx" : "index.jsx";
  let content = [
    `import React, { useEffect, useState } from 'react';`,
    `import { ${routerMode} as Router, Route, Routes, Navigate } from 'react-router-dom';`,
    `import { getRoutes } from './routes';`,
    "",
    "export default function AppRouter() {",
    `  const [routes, setRoutes] = useState({});`,
    `  const [routeComponents, setRouteComponents] = useState({})`,
    "",
    "  useEffect(() => {",
    "    const { routes, routeComponents } = getRoutes();",
    "    setRoutes(routes);",
    "    setRouteComponents(routeComponents);",
    "  }, []);",
    `  const renderRoutes = () => {`,
    "    return Object.keys(routeComponents).map((key) => {",
    "      const { id, parentId, path, isLayout } = routes[key];",
    "      if (isLayout) return null;",
    "      const LayoutComponent = routeComponents[parentId];",
    "      const Component = routeComponents[id];",
    "      if (LayoutComponent) {",
    "        return (",
    "          <Route element={<LayoutComponent />} key={key}>",
    "            <Route key={id} path={path} element={<Component />} />",
    "          </Route>",
    "        )",
    "      }",
    "      return <Route key={id} path={path} element={<Component />} />",
    "    });",
    "  };",
    "",
    "  return (",
    "    <Router>",
    "      <Routes>",
    "        {renderRoutes()}",
    `        <Route path="*" element={<Navigate to="${appData.indexPath}" />} />`,
    "      </Routes>",
    "    </Router>",
    "  );",
    "}",
    ""
  ];
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const generateRoutesFile = async (appData) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, routeComponents } = getRoutes(appData);
  const componentType = isTs ? ": React.ComponentType<P>" : "";
  const lazyComponentWrapperType = isTs ? ": React.FC<P>" : "";
  const genericType = isTs ? "<P>" : "";
  const existLoading = hasLoadingComponent(appData.absLoadingPath);
  let content = [
    "// this file is generated by webpack-plugin-auto-route",
    "// do not change anytime!",
    `import React, { Suspense } from 'react';`,
    "",
    `function withLazyLoad${genericType}(LazyComponent${componentType}) {`,
    `  const lazyComponentWrapper${lazyComponentWrapperType} = (props) => (`,
    `    <Suspense fallback={<div>Loading...</div>}>`,
    `      <LazyComponent {...props} />`,
    `    </Suspense>`,
    `  );`,
    "",
    "  return lazyComponentWrapper;",
    "}",
    "",
    "export function getRoutes() {",
    `  const routes = {${renderRoutes(routes)}};`,
    "  return {",
    "    routes,",
    "    routeComponents: {",
    `      ${renderRouteComponent(routeComponents)}`,
    "    },",
    "  };",
    "}",
    ""
  ];
  if (existLoading) {
    content.splice(3, 0, `import CustomLoading from '../loading';`);
    content[7] = "    <Suspense fallback={<CustomLoading />}>";
  }
  if (isTs) {
    content.unshift("// @ts-nocheck");
  }
  const fileSuffix = isTs ? "routes.tsx" : "routes.jsx";
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const getRoutes = (appData) => {
  const files = getFiles(appData.absPagesPath, appData.excludeFolders, true);
  const layoutFiles = getFiles(appData.absLayoutsPath, appData.excludeFolders, true);
  const hasLayout = layoutFiles.length > 0;
  return fileToRoutes([...files, ...layoutFiles], appData, hasLayout);
};
const fileToRoutes = (files, appData, hasLayout) => {
  const { absPagesPath, absSrcPath, absLayoutsPath } = appData;
  return files.reduce(
    (pre, file) => {
      const isLayout = file.replace(/(\/index)?\.(j|t)sx?$/g, "") === absLayoutsPath;
      const path = isLayout ? "/" : file.replace(absPagesPath, "").replace(/\\/g, "/").replace(/(\/index)?\.(j|t)sx?$/g, "").toLowerCase();
      const id = isLayout ? "@@global-layout" : path.replace(/\//g, "-").slice(1);
      const componentPath = file.replace(absSrcPath, "").replace(/\\/g, "/");
      const { requireLayout = true, ...rest } = getPageMeta(file);
      if (path !== "") {
        pre.routes[id] = {
          path,
          id,
          name: id,
          ...rest
        };
        if (requireLayout && hasLayout && !isLayout) {
          pre.routes[id].parentId = "@@global-layout";
        }
        if (isLayout) {
          pre.routes[id].isLayout = true;
        }
        pre.routeComponents[id] = `..${componentPath}`;
      }
      return pre;
    },
    { routes: {}, routeComponents: {} }
  );
};
const getPageMeta = (file) => {
  const filePathWithoutExt = file.replace(/\\/g, "/").replace(/\.(j|t)sx?$/g, "").toLowerCase();
  const metaFilePath = tryPaths([`${filePathWithoutExt}.meta.json`]);
  if (metaFilePath) {
    try {
      const metaInfo = require(metaFilePath);
      return metaInfo;
    } catch (error) {
    }
  }
  return {};
};
const renderRoutes = (routes) => {
  return Object.keys(routes).map((id) => {
    const route = routes[id];
    let content = [];
    for (const key in route) {
      content.push(`'${key}':'${route[key]}'`);
    }
    return `'${id}':{${content.join(",")}}`;
  });
};
const renderRouteComponent = (routeComponents) => {
  return Object.keys(routeComponents).map((key) => {
    const componentPath = routeComponents[key];
    const chunkName = getChunkName(componentPath);
    return `'${key}':withLazyLoad(React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${componentPath}')))`;
  }).join(",\n");
};

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class WebpackPluginAutoRoutes {
  constructor(options) {
    __publicField(this, "excludeFolders", []);
    __publicField(this, "routingMode", "browser");
    __publicField(this, "onlyRoutes", false);
    __publicField(this, "indexPath", "");
    __publicField(this, "isTsComponent", false);
    __publicField(this, "hasLayouts", false);
    __publicField(this, "isDev", true);
    const {
      excludeFolders = ["components"],
      routingMode = "browser",
      onlyRoutes = false,
      indexPath = "/index"
    } = options || {};
    this.excludeFolders = excludeFolders;
    this.routingMode = routingMode;
    this.onlyRoutes = onlyRoutes;
    this.indexPath = indexPath;
  }
  apply(compiler) {
    compiler.hooks.afterPlugins.tap("WebpackPluginAutoRoutes", () => {
      try {
        this.run();
      } catch (error) {
        console.error("WebpackPluginAutoRoutes failed", error);
      }
    });
  }
  run() {
    const cwd = process.cwd();
    const appData = this.getAppData({ cwd });
    const watcher = chokidar__default.watch(
      [appData.absPagesPath, appData.absLayoutsPath, appData.absLoadingPath],
      {
        ignoreInitial: true
      }
    );
    watcher.on("all", (event) => {
      if (event === "add" || event === "unlink") {
        this.generateRoutes(appData);
      }
    });
    this.generateRoutes(appData);
  }
  generateRoutes(appData) {
    if (!this.onlyRoutes) {
      generateRouterComponent(appData);
    }
    generateRoutesFile(appData);
  }
  // 获取数据
  getAppData({ cwd }) {
    const absSrcPath = path__default.resolve(cwd, "src");
    const absPagesPath = path__default.resolve(cwd, "src/pages");
    const absNodeModulesPath = path__default.resolve(cwd, "node_modules");
    const absRouterPath = path__default.resolve(cwd, "src/router");
    const absLayoutsPath = path__default.resolve(cwd, "src/layouts");
    const absLoadingPath = path__default.resolve(cwd, "src/loading");
    const paths = {
      cwd,
      absSrcPath,
      absPagesPath,
      absNodeModulesPath,
      absRouterPath,
      absLayoutsPath,
      absLoadingPath,
      excludeFolders: this.excludeFolders,
      routingMode: this.routingMode,
      indexPath: this.indexPath
    };
    return paths;
  }
}

module.exports = WebpackPluginAutoRoutes;
