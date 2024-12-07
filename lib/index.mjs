import path from 'path';
import chokidar from 'chokidar';
import fs, { mkdir, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';

const writeToFileAsync = async (filePath, fileSuffix, content, generateNotExist = false) => {
  try {
    await new Promise((resolve, reject) => {
      mkdir(filePath, { recursive: true }, (err) => {
        if (err) {
          console.log(`failed to generate ==== ${fileSuffix}`);
          return reject(err);
        }
        const outputFile = path.join(filePath, fileSuffix);
        if (existsSync(outputFile)) {
          const oldContent = readFileSync(outputFile, "utf-8");
          if (oldContent === content || generateNotExist)
            return resolve();
        }
        writeFileSync(outputFile, content, "utf-8");
        resolve();
      });
    });
  } catch (_) {
    console.log(`failed to generate ${fileSuffix}`);
  }
};
const deepReadDirSync = (root, deep) => {
  let fileList = [];
  const files = readdirSync(root);
  files.forEach((file) => {
    const absFilePath = path.join(root, file);
    if (statSync(absFilePath).isDirectory() && deep) {
      fileList = fileList.concat(deepReadDirSync(absFilePath, deep));
    } else {
      fileList.push(absFilePath);
    }
  });
  return fileList;
};
const getFiles = (root, excludeFolders, deep) => {
  if (!existsSync(root))
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
  return existsSync(path.join(root, "tsconfig.json"));
};
const getChunkName = (path2) => {
  return "src" + path2.replace("..", "").replace(/\.(j|t)sx?$/, "").replace(/\//g, "__").toLowerCase();
};
const tryPaths = (paths) => {
  for (const path2 of paths) {
    if (existsSync(path2))
      return path2;
  }
  return "";
};
function debounce(func, wait, immediate = false) {
  let timeout = null;
  return function(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };
    const shouldCallNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
    if (shouldCallNow) {
      func(...args);
    }
  };
}

const layoutId = "@@global-layout";
const fileCache = {};
const generateRouterComponent = async (appData) => {
  const isTs = isTsProject(appData.cwd);
  const routerMode = appData.routingMode === "browser" ? "BrowserRouter" : "HashRouter";
  const fileSuffix = isTs ? "index.tsx" : "index.jsx";
  let content = [
    `import React from 'react';`,
    `import { ${routerMode} as Router, Route, Routes, Navigate } from 'react-router-dom';`,
    `import { getRoutes } from './routes';`,
    "",
    "export default function AppRouter() {",
    `  const { routes, routeComponents } = getRoutes();`,
    "",
    `  const renderRoutes = () => {`,
    "    return Object.keys(routeComponents).map((key) => {",
    "      const { id, parentId, path, isLayout } = routes[key];",
    "      if (isLayout) return null;",
    "      const LayoutComponent = parentId ? routeComponents[parentId] : null;",
    "      const Component = routeComponents[id];",
    "      if (LayoutComponent) {",
    "        return (",
    "          <Route element={<LayoutComponent />} key={key}>",
    "            <Route key={id} path={path} element={<Component />} />",
    "          </Route>",
    "        );",
    "      }",
    "      return <Route key={id} path={path} element={<Component />} />;",
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
  if (isTs) {
    content.splice(
      5,
      1,
      "  const { routes, routeComponents }: { routes: RoutesMap; routeComponents: RouteComponentsMap } = getRoutes();"
    ).splice(
      3,
      0,
      ...[
        "",
        "interface RouteConfig {",
        "  id: string;",
        "  parentId?: string;",
        "  path: string;",
        "  isLayout?: boolean;",
        "  [key: string]: any;",
        "}",
        "",
        "type RoutesMap = Record<string, RouteConfig>;",
        "type RouteComponentsMap = Record<string, React.ComponentType<any>>;"
      ]
    );
  }
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"), true);
};
const generateRoutesFile = async (appData, useCache) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, routeComponents } = getRoutes(appData, useCache);
  let content = [
    "// this file is generated by webpack-plugin-auto-routes",
    "// do not change anytime!",
    `import React from 'react';`,
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
  if (isTs) {
    content.unshift("// @ts-nocheck");
  }
  const fileSuffix = isTs ? "routes.tsx" : "routes.jsx";
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const getRoutes = (appData, useCache) => {
  const { absPagesPath, absLayoutsPath, excludeFolders } = appData;
  const files = getFilesWithCache(absPagesPath, excludeFolders, true, useCache);
  const layoutFiles = getFilesWithCache(absLayoutsPath, excludeFolders, false, useCache);
  const hasLayout = layoutFiles.length > 0;
  return fileToRoutes([...files, ...layoutFiles], appData, hasLayout);
};
const getFilesWithCache = (filesPath, excludeFolders, deep, useCache) => {
  const cacheKey = `${filesPath}_${excludeFolders.join("_")}`;
  if (useCache && fileCache[cacheKey]) {
    return fileCache[cacheKey];
  }
  const files = getFiles(filesPath, excludeFolders, deep);
  fileCache[cacheKey] = files;
  return files;
};
const fileToRoutes = (files, appData, hasLayout) => {
  const { absPagesPath, absSrcPath, absLayoutsPath } = appData;
  return files.reduce(
    (pre, file) => {
      const isLayout = file.replace(/(\/index)?\.(j|t)sx?$/g, "") === absLayoutsPath;
      const path = isLayout ? "/" : file.replace(absPagesPath, "").replace(/\\/g, "/").replace(/(\/index)?\.(j|t)sx?$/g, "").toLowerCase();
      const id = isLayout ? layoutId : path.replace(/\//g, "-").slice(1);
      const componentPath = file.replace(absSrcPath, "").replace(/\\/g, "/");
      let { requireLayout, ...rest } = getPageMeta(file);
      requireLayout = requireLayout ?? true;
      if (path !== "") {
        pre.routes[id] = {
          path,
          id,
          name: id,
          ...rest
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
    { routes: {}, routeComponents: {} }
  );
};
const getPageMeta = (file) => {
  const filePathWithoutExt = file.replace(/\\/g, "/").replace(/\.(j|t)sx?$/g, "").toLowerCase();
  const metaFilePath = tryPaths([`${filePathWithoutExt}.meta.json`]);
  if (metaFilePath) {
    try {
      const metaInfo = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
      return metaInfo;
    } catch (error) {
      return {};
    }
  }
  return {};
};
const renderRoutes = (routes) => {
  return Object.keys(routes).map((id) => {
    const route = routes[id];
    let content = [];
    for (const key in route) {
      let value = route[key];
      value = typeof value === "string" ? `'${value}'` : value;
      content.push(`'${key}':${value}`);
    }
    return `'${id}':{${content.join(",")}}`;
  });
};
const renderRouteComponent = (routeComponents) => {
  return Object.keys(routeComponents).map((key) => {
    const componentPath = routeComponents[key];
    const chunkName = getChunkName(componentPath);
    return `'${key}':React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${componentPath}'))`;
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
    __publicField(this, "indexPath", "");
    __publicField(this, "isTsComponent", false);
    __publicField(this, "hasLayouts", false);
    __publicField(this, "isDev", true);
    const {
      excludeFolders = ["components"],
      routingMode = "browser",
      indexPath = "/index"
    } = options || {};
    this.excludeFolders = excludeFolders;
    this.routingMode = routingMode;
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
    const watchFileSuffix = ["js", "jsx", "ts", "tsx", "meta.json"];
    const watchChangeFileSuffix = ["meta.json"];
    const watcher = chokidar.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true
    });
    watcher.on(
      "all",
      debounce((event, path2) => {
        const isWatchFile = watchFileSuffix.some((suffix) => path2.endsWith(suffix));
        const isWatchChangeFile = watchChangeFileSuffix.some((suffix) => path2.endsWith(suffix));
        if ((event === "add" || event === "unlink") && isWatchFile) {
          generateRoutesFile(appData, false);
        } else if (event === "change" && isWatchChangeFile) {
          generateRoutesFile(appData, true);
        }
      }, 300)
    );
    generateRouterComponent(appData);
    generateRoutesFile(appData, false);
  }
  // 获取数据
  getAppData({ cwd }) {
    const absSrcPath = path.resolve(cwd, "src");
    const absPagesPath = path.resolve(cwd, "src/pages");
    const absNodeModulesPath = path.resolve(cwd, "node_modules");
    const absRouterPath = path.resolve(cwd, "src/router");
    const absLayoutsPath = path.resolve(cwd, "src/layouts");
    const paths = {
      cwd,
      absSrcPath,
      absPagesPath,
      absNodeModulesPath,
      absRouterPath,
      absLayoutsPath,
      excludeFolders: this.excludeFolders,
      routingMode: this.routingMode,
      indexPath: this.indexPath
    };
    return paths;
  }
}

export { WebpackPluginAutoRoutes as default };
