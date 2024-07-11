import path from 'path';
import { readdirSync, statSync, existsSync, mkdir, readFileSync, writeFileSync } from 'fs';
import chokidar from 'chokidar';

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
    compiler.hooks.afterPlugins.tap("WebpackPluginAutoRoutes", async () => {
      try {
        console.log(2333333);
        await this.run();
      } catch (error) {
        console.error("WebpackPluginAutoRoutes failed", error);
      }
    });
  }
  async run() {
    const cwd = process.cwd();
    const appData = this.getAppData({ cwd });
    const watcher = chokidar.watch(appData.absPagesPath, { ignoreInitial: true });
    watcher.on("all", async (event) => {
      if (event === "add" || event === "unlink") {
        this.generateRoutes(appData);
      }
    });
    this.generateRoutes(appData);
  }
  async generateRoutes(appData) {
    const routes = await this.getRoutes({ appData });
    this.generateRoutesFile({ routes, appData });
    if (!this.onlyRoutes) {
      this.generateRouterComponent(appData);
    }
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
  // 查找文件
  deepReadDirSync(root, deep) {
    let fileList = [];
    const files = readdirSync(root);
    files.forEach((file) => {
      const absFile = path.join(root, file);
      if (statSync(absFile).isDirectory() && deep) {
        fileList = fileList.concat(this.deepReadDirSync(absFile, deep));
      } else {
        fileList.push(absFile);
      }
    });
    return fileList;
  }
  // 获取文件
  getFiles(root, excludeFolders, deep) {
    if (!existsSync(root))
      return [];
    const fileList = this.deepReadDirSync(root, deep);
    return fileList.filter((file) => {
      const fileSuffixTs = /\.tsx?$/;
      if (fileSuffixTs.test(file)) {
        this.isTsComponent = true;
      }
      return this.isValidFile(file, excludeFolders);
    });
  }
  // 校验文件
  isValidFile(file, excludeFolders) {
    const fileRegex = /\.(j|t)sx?$/;
    const typeFileRegex = /.*\.d\.ts$/;
    const excludeRegex = new RegExp(`(${excludeFolders.join("|")})\\/`);
    return fileRegex.test(file) && !typeFileRegex.test(file) && !excludeRegex.test(file);
  }
  // 生成路由
  filesToRoutes(files, appData) {
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
  }
  // 获取路由文件
  getRoutes({ appData }) {
    return new Promise((resolve) => {
      const files = this.getFiles(appData.absPagesPath, appData.excludeFolders, true);
      const layoutsFileList = this.getFiles(appData.absLayoutsPath, appData.excludeFolders, false);
      const routes = this.filesToRoutes(files, appData);
      const layoutRoutes = layoutsFileList.map((file) => {
        const componentPath = file.replace(appData.absSrcPath, "").replace(/\\/g, "/");
        return {
          path: "/",
          name: "@@global-layout",
          component: `..${componentPath}`,
          routes: [{ path: "", name: "redirect", component: `() => <Navigate to='/home' replace />` }, ...routes]
        };
      });
      if (layoutRoutes.length) {
        this.hasLayouts = true;
        resolve(layoutRoutes);
      } else {
        this.hasLayouts = false;
      }
      resolve(routes);
    });
  }
  // 获取重复字符
  repeatString(str, times) {
    return new Array(times).fill(str).join("");
  }
  // 获取chunk名称
  generateChunkName(component) {
    return "src" + component.replace("..", "").replace(/\.(j|t)sx?$/, "").replace(/\//g, "__").toLowerCase();
  }
  // 格式化文件
  formatRoute(route, level) {
    const { path: path2, name, component, routes = [] } = route;
    const indent = this.repeatString("  ", level * 2);
    const deeperIndent = this.repeatString("  ", level * 2 + 1);
    const chunkName = this.generateChunkName(component);
    if (name === "redirect") {
      return `
${indent}{
${deeperIndent}path: '${path2}',
${deeperIndent}name: '${name}',
${deeperIndent}Component: ${component}
${indent}}`;
    }
    return `
${indent}{
${deeperIndent}path: '${path2}',
${deeperIndent}name: '${name}',
${deeperIndent}Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${component}'))),
${deeperIndent}children: [${this.renderRoutes(routes, level + 1)}]
${indent}}`;
  }
  // 渲染路由
  renderRoutes(routes, level) {
    return routes.map((route) => this.formatRoute(route, level)).join(",");
  }
  // 获取路由模板
  getRoutesTemplate(routes, isTs, hasLayouts) {
    const componentType = isTs ? ": React.ComponentType<P>" : "";
    const lazyComponentWrapperType = isTs ? ": React.FC<P>" : "";
    const genericType = isTs ? "<P>" : "";
    return `import React, { Suspense } from 'react';${hasLayouts ? `
import { Navigate } from 'react-router-dom';` : ""}
    
function withLazyLoad${genericType}(LazyComponent${componentType}) {
  const lazyComponentWrapper${lazyComponentWrapperType} = (props) => (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return lazyComponentWrapper;
}

export function getRoutes() {
  const routes = [${this.renderRoutes(routes, 1)}
  ];
  return routes;
}`;
  }
  // 获取路由组件模板
  getRouterComponentTemplate(isTs, indexPath, routerMode) {
    return `import React, { useEffect, useState } from 'react';
import { ${routerMode} as Router, Route, Routes, Navigate } from 'react-router-dom';
import { getRoutes } from './routes';
${isTs ? "\ninterface IRoute {\n  path: string;\n  name: string;\n  Component: React.FC;\n  children?: IRoute[];\n}" : ""}

export default function AppRouter() {
  const [routes, setRoutes] = useState${isTs ? "<IRoute[]>" : ""}([]);

  useEffect(() => {
    setRoutes(getRoutes());
  }, []);

  const renderRoutes = (routes${isTs ? ": IRoute[]" : ""}) => {
    return routes.map((route) => {
      const { path, Component, children = [] } = route || {};
      return (
        <Route key={path} path={path} element={<Component />}>
          {renderRoutes(children)}
        </Route>
      );
    })
  }

  if (!routes.length) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {renderRoutes(routes)}
        <Route path="*" element={<Navigate to="${indexPath}" />} />
      </Routes>
    </Router>
  );
}`;
  }
  // 生成路由文件
  generateRoutesFile({ appData, routes }) {
    const content = this.getRoutesTemplate(routes, this.isTsComponent, this.hasLayouts);
    const fileSuffix = this.isTsComponent ? "routes.tsx" : "routes.jsx";
    this.writeToFileAsync(appData.absRouterPath, fileSuffix, content);
  }
  // 生成路由组件
  generateRouterComponent(appData) {
    const isTsComponent = this.isTsComponent;
    this.hasLayouts;
    const routerMode = appData.routingMode === "browser" ? "BrowserRouter" : "HashRouter";
    const content = this.getRouterComponentTemplate(isTsComponent, appData.indexPath, routerMode);
    const fileSuffix = isTsComponent ? "index.tsx" : "index.jsx";
    this.writeToFileAsync(appData.absRouterPath, fileSuffix, content);
  }
  writeToFileAsync(filePath, fileSuffix, content) {
    try {
      mkdir(filePath, { recursive: true }, (err) => {
        if (err) {
          console.error(`Failed to generate ${fileSuffix}`, err);
        }
        const outputFile = path.join(filePath, fileSuffix);
        if (existsSync(outputFile)) {
          const oldFile = readFileSync(outputFile, "utf-8");
          if (oldFile === content)
            return;
        }
        writeFileSync(outputFile, content, "utf-8");
      });
    } catch (error) {
      console.error(`Failed to generate ${fileSuffix}`, error);
    }
  }
}

export { WebpackPluginAutoRoutes as default };
