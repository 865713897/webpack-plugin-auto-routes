import path from 'path';
import chokidar from 'chokidar';
import fs, { existsSync, mkdir, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';

const writeToFileAsync = async (filePath, fileSuffix, content) => {
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
          if (oldContent === content)
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
const getFiles = (root, ignoreFolders, ignoreFiles, deep) => {
  if (!existsSync(root))
    return [];
  const fileList = deepReadDirSync(root, deep);
  return fileList.filter((file) => {
    const isPageComponent = TestPageComponent(file, ignoreFolders, ignoreFiles);
    const isLayoutComponent = TestLayoutComponent(file);
    if (deep) {
      return isPageComponent;
    }
    return isPageComponent && isLayoutComponent;
  });
};
const TestPageComponent = (file, ignoreFolders, ignoreFiles) => {
  if (typeof file !== "string" || !Array.isArray(ignoreFolders)) {
    throw new Error("Invalid arguments: file should be a string and ignoreFolders an array.");
  }
  const PAGE_FILE_REGEX = /\.(jsx?|tsx?)$/;
  const TYPE_FILE_REGEX = /\.d\.ts$/;
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ignoreFoldersRegex = new RegExp(`(${ignoreFolders.map(escapeRegex).join("|")})\\/`);
  const ignoreFilesRegex = new RegExp(`(${ignoreFiles.map(escapeRegex).join("|")})$`);
  return PAGE_FILE_REGEX.test(file) && // 文件扩展名符合页面组件
  !TYPE_FILE_REGEX.test(file) && // 排除类型声明文件
  !ignoreFilesRegex.test(file) && // 排除常见工具类文件
  !ignoreFoldersRegex.test(file);
};
const TestLayoutComponent = (file) => {
  return /\/src\/layouts\/index/.test(file);
};
const isTsProject = (root) => {
  return existsSync(path.join(root, "tsconfig.json"));
};
const isExistRouter = (filePaths) => tryPaths(filePaths).length > 0;
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

const FILE_EXTENSION_REGEX = /(\/index)?\.(j|t)sx?$/g;
const LAYOUT_ID = "@@global-layout";
const fileCache = {};
const generateRouterComponent = async (appData) => {
  const isTs = isTsProject(appData.cwd);
  const routerMode = appData.mode === "browser" ? "BrowserRouter" : "HashRouter";
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
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const generateRoutesFile = async (appData, useCache) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, routeComponents } = getRoutes(appData, useCache);
  let content = [
    "// this file is generated by webpack-plugin-auto-routes",
    "// do not change anytime!",
    `import React, { Suspense } from 'react';`,
    "",
    "function withLazyLoad(LazyComponent) {",
    "  const lazyComponentWrapper = (props) => (",
    "    <Suspense fallback={props.loadingComponent}>",
    "      <LazyComponent {...props} />",
    "    </Suspense>",
    "  );",
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
  if (isTs) {
    content.unshift("// @ts-nocheck");
  }
  const fileSuffix = isTs ? "routes.tsx" : "routes.jsx";
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const getRoutes = (appData, useCache) => {
  const { absPagesPath, absLayoutsPath, ignoreFolders, ignoreFiles } = appData;
  const files = getFilesWithCache(absPagesPath, ignoreFolders, ignoreFiles, true, useCache);
  const layoutFiles = getFilesWithCache(
    absLayoutsPath,
    ignoreFolders,
    ignoreFiles,
    false,
    useCache
  );
  const hasLayout = layoutFiles.length > 0;
  return fileToRoutes([...files, ...layoutFiles], appData, hasLayout);
};
const getFilesWithCache = (filesPath, ignoreFolders, ignoreFiles, deep, useCache) => {
  const cacheKey = filesPath;
  if (useCache && fileCache[cacheKey]) {
    return fileCache[cacheKey];
  }
  const files = getFiles(filesPath, ignoreFolders, ignoreFiles, deep);
  fileCache[cacheKey] = files;
  return files;
};
function normalizePath(file, basePath) {
  return file.replace(basePath, "").replace(/\\/g, "/");
}
const fileToRoutes = (files, appData, hasLayout) => {
  const { absPagesPath, absLayoutsPath } = appData;
  return files.reduce(
    (acc, file) => {
      const { routes, routeComponents } = acc;
      const isLayout = file.replace(FILE_EXTENSION_REGEX, "") === absLayoutsPath;
      const routePath = isLayout ? "/" : normalizePath(file, absPagesPath).replace(FILE_EXTENSION_REGEX, "").toLowerCase() || "/";
      const routeId = isLayout ? LAYOUT_ID : routePath === "/" ? "index" : routePath.replace(/\//g, "-").slice(1);
      const componentPath = path.relative(appData.absRouterPath, file);
      const { requireLayout = true, ...rest } = getPageMeta(file);
      routes[routeId] = {
        // 约定以$开头的组件为动态路由组件，如：$id.tsx
        path: routePath.replace("$", ":"),
        id: routeId,
        name: routeId,
        ...rest
      };
      if (requireLayout && hasLayout && !isLayout) {
        routes[routeId].parentId = LAYOUT_ID;
      }
      if (isLayout) {
        routes[routeId].isLayout = true;
      }
      routeComponents[routeId] = componentPath;
      return acc;
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
    return `'${key}': withLazyLoad(React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${componentPath}')))`;
  }).join(",\n");
};

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class WebpackPluginAutoRoutes {
  constructor(options = {}) {
    __publicField(this, "context", "");
    __publicField(this, "entry", "");
    __publicField(this, "ignoreFolders", []);
    __publicField(this, "ignoreFiles", ["meta.json"]);
    __publicField(this, "mode", "browser");
    __publicField(this, "indexPath", "");
    __publicField(this, "isTsComponent", false);
    __publicField(this, "hasLayouts", false);
    __publicField(this, "isDev", true);
    const defaultOptions = {
      context: "",
      entry: "",
      ignoreFolders: "components,service,services,utils,assets,styles,types,hooks,interfaces,api,constants,models".split(
        ","
      ),
      ignoreFiles: "const,service,services,utils,assets,styles,types,hooks,interfaces,api,constants,models".split(
        ","
      ),
      mode: "browser",
      indexPath: "/index"
    };
    const { context, entry, ignoreFolders, ignoreFiles, mode, indexPath } = {
      ...defaultOptions,
      ...options
    };
    this.context = context;
    this.entry = entry;
    this.ignoreFolders = ignoreFolders;
    this.ignoreFiles = ignoreFiles;
    this.mode = mode;
    this.indexPath = indexPath;
  }
  apply(compiler) {
    compiler.hooks.afterPlugins.tap("WebpackPluginAutoRoutes", () => {
      try {
        this.run();
      } catch (error) {
        throw new Error(`WebpackPluginAutoRoutes failed, ${error}`);
      }
    });
  }
  run() {
    const cwd = process.cwd();
    const appData = this.getAppData({ cwd });
    const watchFileSuffix = ["js", "jsx", "ts", "tsx", "meta.json"];
    const watcher = chokidar.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true
    });
    watcher.on(
      "all",
      debounce((event, filePath) => {
        const isWatchFile = watchFileSuffix.some((suffix) => filePath.endsWith(suffix));
        if (isWatchFile) {
          if (["add", "unlink"].includes(event)) {
            this.generate(appData);
          } else if (event === "change" && filePath.endsWith("meta.json")) {
            this.generate(appData, true);
          }
        }
      }, 300)
    );
    this.generate(appData);
  }
  // 获取数据
  getAppData({ cwd }) {
    const resolveAppPath = (relativePath, base = cwd) => path.resolve(base, relativePath);
    const absSrcPath = resolveAppPath("src");
    const absNodeModulesPath = resolveAppPath("node_modules");
    const absRouterPath = resolveAppPath("src/router");
    const absLayoutsPath = resolveAppPath("src/layouts");
    let absPagesPath = resolveAppPath("src/pages");
    if (this.entry) {
      if (path.isAbsolute(this.entry)) {
        absPagesPath = this.entry;
      } else if (this.context) {
        absPagesPath = resolveAppPath(this.entry, this.context);
      } else {
        throw "context is required when entry is not absolute!";
      }
    }
    const paths = {
      cwd,
      absSrcPath,
      absPagesPath,
      absNodeModulesPath,
      absRouterPath,
      absLayoutsPath,
      ignoreFolders: this.ignoreFolders,
      ignoreFiles: this.ignoreFiles,
      mode: this.mode,
      indexPath: this.indexPath
    };
    return paths;
  }
  generate(appData, isMetaChange = false) {
    const routerComponentPaths = [
      path.resolve(appData.absRouterPath, "index.tsx"),
      path.resolve(appData.absRouterPath, "index.jsx"),
      path.resolve(appData.absRouterPath, "index.js"),
      path.resolve(appData.absRouterPath, "index.ts")
    ];
    if (!isExistRouter(routerComponentPaths)) {
      generateRouterComponent(appData);
    }
    generateRoutesFile(appData, isMetaChange);
  }
}

export { WebpackPluginAutoRoutes as default };
