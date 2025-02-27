<div align="center">
  <img src="./assets//logo.png" />
  <h3>基于Webpack的自动生成路由插件</h3>
  <p>
    <a href="https://www.npmjs.com/package/webpack-plugin-auto-routes">
      <img src="https://img.shields.io/badge/webpack-%3E%3D5-blue
      " />
    </a>
  </p>
</div>

---

## 介绍

一个简洁高效的 Webpack 插件，用于动态生成路由文件，帮助开发者轻松实现约定式路由功能。

---

## 特性

- 📂 **动态生成**：根据文件目录结构自动生成路由配置
- 🛠️ **路由元信息**：支持通过 `*.meta.json` 文件为每个路由配置附加信息
- 🤝 **动态路由**：约定以`$`开头的文件为动态路由文件，例如 `$id.tsx`
- ⚙️ **多页面入口**：支持配置多个页面入口，默认以页面入口下的 `Layout.(jsx|tsx)` 作为局部路由，优先级高于全局路由；例如 `src/pages/Layout.tsx`
- 📝 **全局 Layout 支持**：默认使用 `src/layouts/index.(jsx|tsx)` 文件作为全局路由文件

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

### 配置

在 `webpack.config.ts` 中配置

```javascript
import WebpackPluginAutoRoutes from 'webpack-plugin-auto-routes';

export default {
  // ...其他配置项
  plugins: [
    new WebpackPluginAutoRoutes({
      // 配置项
      dirs: '',
      moduleType: 'tsx',
    }),
  ],
};
```

### 使用

```javascript
import { getRoutes } from 'virtual-routes';
```

引入 virtual:routes 会导出 getRoutes 方法，返回一个对象，包含 routes 和 routeComponents

```typescript
export const getRoutes: () => {
  routes: Record<
    string,
    {
      id: string;
      path: string;
      parentId: string;
      isLayout?: boolean;
      [key: string]: any;
    }
  >;
  routeComponents: Record<string, React.ComponentType<any>>;
};
```

### 配置项

#### dirs

- **类型**: `string | (string | dirOptions)[]`
- **默认值**: `'src/pages'`

```typescript
interface dirOptions {
  /**
   * 页面入口
   * @default 'src/pages'
   */
  dir: string;
  /**
   * 基本路径
   * @default '/'
   */
  basePath?: string;
  /**
   * 过滤规则
   * @example /\.(jsx?|tsx)$/
   */
  pattern?: RegExp;
}
```

传入多个目录时，会递归遍历每个目录下的文件，生成对应的路由配置，并将基本路径加入生成的路由。

还可以使用 pattern 过滤文件，例如只生成以 `.tsx` 结尾的文件。

#### moduleType

- **类型**: `jsx|tsx`
- **默认值**: `'tsx'`

指定生成的路由文件类型，例如 `jsx`、`tsx` 。

### 路由元数据

允许用户使用 `.meta.json` 文件为每个路由配置附加信息，`meta` 文件必须放在与路由文件同级目录下，文件名必须以 `.meta.json` 结尾。

你可以在 `meta` 中配置的属性有：

- `id`: 路由 id，默认生成，例如 `src/pages/about` 会生成 `about` 作为 id，此 id 会在 routeComponents 中对应一个组件
- `path`: 路由路径，默认生成，例如 `src/pages/about` 会生成 `/about` 作为 path
- `parentId`: 父级路由 id，如果存在页面局部路由或全局路由，会自动生成 parentId 为局部路由 id 或全局路由 id
- `requireLayout`: 是否需要局部路由或全局路由，默认为 true，如果为 false，则不会生成 parentId
- 其他自定义属性

### 示例

文件结构

```plaintext
src
├── manage
│   ├── index.tsx
├── pages
│   ├── index.tsx
│   ├── about.tsx
│   ├── about.meta.json
│   ├── user
│   │   ├── index.tsx
│   │   ├── $id.tsx
│   │   └── $id.meta.json
│   └── Layout.tsx
├── layouts
│   └── index.tsx
```

路由默认写入的位置为 `**/.virtual_routes/index.tsx` ，和 `src` 同级

生成的路由配置

```typescript
// @ts-nocheck
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
  const routes = {
    '@@pages-layout': { id: '@@pages-layout', path: '/layout', isLayout: true },
    'pages-about': {
      id: 'pages-about',
      path: '/about',
      parentId: '@@pages-layout',
    },
    index: { id: 'index', path: '/', parentId: '@@pages-layout' },
    'user-$id': {
      id: 'user-$id',
      path: '/user/:id',
      name: 'userId',
      parentId: '@@pages-layout',
    },
    user: { id: 'user', path: '/user', parentId: '@@pages-layout' },
    manage: { id: 'manage', path: '/manage', parentId: '@@global-layout' },
    '@@global-layout': { id: '@@global-layout', path: '/', isLayout: true },
  };
  return {
    routes,
    routeComponents: {
      '@@pages-layout': withLazyLoad(
        React.lazy(() => import('./src/pages/Layout.tsx'))
      ),
      'pages-about': withLazyLoad(
        React.lazy(() => import('./src/pages/about.tsx'))
      ),
      index: withLazyLoad(React.lazy(() => import('./src/pages/index.tsx'))),
      'user-$id': withLazyLoad(
        React.lazy(() => import('./src/pages/user/$id.tsx'))
      ),
      user: withLazyLoad(
        React.lazy(() => import('./src/pages/user/index.tsx'))
      ),
      manage: withLazyLoad(React.lazy(() => import('./src/manage/index.tsx'))),
      '@@global-layout': withLazyLoad(
        React.lazy(() => import('./src/layouts/index.tsx'))
      ),
    },
  };
}
```
