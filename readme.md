## webpack-plugin-auto-routes

(https://github.com/865713897/webpack-plugin-auto-routes)

借鉴 `umi` 的约定式路由
一个简洁高效的 Webpack 插件，用于动态生成路由文件，帮助开发者轻松实现约定式路由功能。

---

## 特性

- 📂 **动态路由生成**：根据文件目录结构自动生成路由配置。
- 🛠️ **灵活路由模式**：支持 `browser` 模式（基于历史记录的路由）或 `hash` 模式。
- ✂️ **忽略文件/文件夹**：支持自定义忽略的文件和文件夹。
- 📝 **路由元信息**：支持通过 `*.meta.json` 文件为每个路由配置 `path`、`title`、`requireLayout` 等附加信息。
- 🖼️ **全局布局支持**：默认使用 `src/layouts/index.jsx` 或 `src/layouts/index.tsx` 文件作为全局布局组件。

---

## 安装

```bash
npm install webpack-plugin-auto-routes --save-dev
or
yarn add webpack-plugin-auto-routes --dev
or
pnpm add webpack-plugin-auto-routes --save-dev
```

---

## 使用方法

### 基础用法

在 `webpack.config.js` 中引入并配置插件

```javascript
const AutoRoutes = require('webpack-plugin-auto-routes');

module.exports = {
  // ...其他配置
  plugins: [
    new AutoRoutes({
      // 配置项
    }),
  ],
};
```

### 参数说明

| 参数名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| context | string | undefined | 配置上下文，如果entry非绝对路径，必填 |
| entry | string | undefined | 扫描路由文件的根目录。默认以src/pages为目标 |
| ignoreFolders | string[] | ['components', 'service', 'services', 'utils', 'assets', 'styles', 'types', 'hooks', 'interfaces', 'api', 'constants', 'models'] | 要忽略的文件夹名称列表。 |
| ignoreFiles | string[] | ['const', 'service', 'services', 'utils', 'assets', 'styles', 'types', 'hooks', 'interfaces', 'api', 'constants', 'models'] | 要忽略的文件名或匹配模式（支持 glob 语法）。 |
| mode | string | 'browser' | 路由模式，支持 'browser' 或 'hash' 。 |
| indexPath | string | '/' | 默认跳转跟路由。 |

### 路由元信息支持
约定以`$`开头的组件为动态路由组件
```arduino
src/
  layouts/
    index.jsx
  pages/
    home/
      index.jsx
      index.meta.json
    info/
      $id.jsx
      $id.meta.json
    404.jsx
    404.meta.json
```
`home/index.meta.json`文件内容
```json
{
  "path": "/home",
  "title": "首页",
  "name": "custom-name",
  "requireLayout": false
}
```
生成的路由配置示例
```javascript
// this file is generated by webpack-plugin-auto-routes
// do not change anytime!
import React, { Suspense } from 'react';

function withLazyLoad(LazyComponent) {
  const lazyComponentWrapper = (props) => (
    <Suspense fallback={props.loadingComponent}>
      <LazyComponent {...props} />
    </Suspense>
  );
  return lazyComponentWrapper;
}

export function getRoutes() {
  const routes = {'404':{'path':'/404','id':'404','name':'404'},'home':{'path':'/home','id':'home','name':'custom-name','title':'首页'},'info-$id':{'path':'/info/:id','id':'info-$id','name':'info-$id','parentId':'@@global-layout'},'@@global-layout':{'path':'/','id':'@@global-layout','name':'@@global-layout','isLayout':true}};
  return {
    routes,
    routeComponents: {
      '404': withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__404" */ '../pages/404.jsx'))),
'home': withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__home__index" */ '../pages/home/index.jsx'))),
'info-$id': withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__home__$id" */ '../pages/info/$id.jsx'))),
'@@global-layout': withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__layouts__index" */ '../layouts/index.jsx')))
    },
  };
}
```

---

## 兼容性

- Webpack: 需要版本 `^5.0.0`
- Node.js: 需要版本 `>=14`

---

## 注意事项

- 请确保在 `webpack.config.js` 中正确引入并配置 `webpack-plugin-auto-routes` 插件。
- 插件会根据文件目录结构自动生成路由配置，因此请确保目录结构符合约定。
- 如果需要自定义路由配置，可以使用`*.meta.json`文件。

---

## 贡献

如果您有任何建议或改进意见，欢迎提交 Pull Request 或 Issue。

---

## 许可证

本项目采用 MIT 许可证。