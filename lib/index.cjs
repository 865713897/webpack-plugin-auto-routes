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
const getChunkName = (path2) => {
  return "src" + path2.replace("..", "").replace(/\.(j|t)sx?$/, "").replace(/\//g, "__").toLowerCase();
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
    `  const [routes, setRoutes] = useState${isTs ? "<IRoute[]>" : ""}([]);`,
    "",
    "  useEffect(() => {",
    "    setRoutes(getRoutes());",
    "  }, []);",
    "",
    `  const renderRoutes = (routes${isTs ? ": IRoute[]" : ""}) => {`,
    "    return routes.map((route) => {",
    "      const { path, Component, children = [] } = route || {};",
    "      return (",
    "        <Route key={path} path={path} element={<Component />}>",
    "          {renderRoutes(children)}",
    "        </Route>",
    "      );",
    "    });",
    "  };",
    "",
    "  return (",
    "    <Router>",
    "      <Routes>",
    "        {renderRoutes(routes)}",
    `        <Route path="*" element={<Navigate to="${appData.indexPath}" />} />`,
    "      </Routes>",
    "    </Router>",
    "  );",
    "}",
    ""
  ];
  if (isTs) {
    content.splice(
      3,
      0,
      "\ninterface IRoute {\n  path: string;\n  name: string;\n  Component: React.FC;\n  children?: IRoute[];\n}"
    );
  }
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const generateRoutesFile = async (appData) => {
  const isTs = isTsProject(appData.cwd);
  const { routes, hasLayout } = await getRoutes(appData);
  const componentType = isTs ? ": React.ComponentType<P>" : "";
  const lazyComponentWrapperType = isTs ? ": React.FC<P>" : "";
  const genericType = isTs ? "<P>" : "";
  let content = [
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
    `  const routes = [`,
    `    ${renderRoutes(routes, 1)}`,
    "  ];",
    "  return routes;",
    "}",
    ""
  ];
  if (hasLayout) {
    content.splice(1, 0, `import { Navigate } from 'react-router-dom';`);
  }
  if (isTs) {
    content.unshift("// @ts-nocheck");
  }
  const fileSuffix = isTs ? "routes.tsx" : "routes.jsx";
  await writeToFileAsync(appData.absRouterPath, fileSuffix, content.join("\n"));
};
const getRoutes = (appData) => {
  return new Promise(
    (resolve) => {
      const files = getFiles(appData.absPagesPath, appData.excludeFolders, true);
      const layoutsFileList = getFiles(appData.absLayoutsPath, appData.excludeFolders, false);
      const routes = fileToRoutes(files, appData);
      const layoutRoutes = layoutsFileList.map((file) => {
        const componentPath = file.replace(appData.absSrcPath, "").replace(/\\/g, "/");
        return {
          path: "/",
          name: "@@global-layout",
          component: `..${componentPath}`,
          routes: [
            { path: "", name: "redirect", component: `() => <Navigate to='/home' replace />` },
            ...routes
          ]
        };
      });
      if (layoutRoutes.length) {
        resolve({ routes: layoutRoutes, hasLayout: true });
      } else {
        resolve({ routes, hasLayout: false });
      }
    }
  );
};
const fileToRoutes = (files, appData) => {
  const { absPagesPath, absSrcPath } = appData;
  return files.reduce((pre, file) => {
    const filePath = file.replace(absPagesPath, "").replace(/\\/g, "/").replace(/(\/index)?\.(j|t)sx?$/g, "").toLowerCase();
    const name = filePath.replace(/\//g, "-").slice(1);
    const componentPath = file.replace(absSrcPath, "").replace(/\\/g, "/");
    if (filePath !== "") {
      pre.push({
        path: filePath,
        name,
        component: `..${componentPath}`
      });
    }
    return pre;
  }, []);
};
const renderRoutes = (routes, level) => {
  return routes.map((route) => {
    const { path, name, component, routes: routes2 = [] } = route;
    const indent = "".padStart((level + 1) * 2);
    const deeperIndent = "".padStart((level + 2) * 2);
    const chunkName = getChunkName(component);
    let content = [
      `{`,
      `${deeperIndent}path: '${path}',`,
      `${deeperIndent}name: '${name}',`,
      `${deeperIndent}Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${component}'))),`,
      `${deeperIndent}children: [${renderRoutes(routes2, level + 1)}]`,
      `${indent}}`
    ];
    if (name === "redirect") {
      content.splice(4, 1);
      content[3] = `${deeperIndent}Component: ${component},`;
    }
    return content.join("\n");
  }).join(",");
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
    const watcher = chokidar__default.watch([appData.absPagesPath, appData.absLayoutsPath], {
      ignoreInitial: true
    });
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

module.exports = WebpackPluginAutoRoutes;
