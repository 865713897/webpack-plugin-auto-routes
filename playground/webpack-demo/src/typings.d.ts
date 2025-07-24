declare module '*.svg';
declare module '*.png';
declare module '*.css';

declare interface RouteType {
  id: string;
  path: string;
  Component: LazyExoticComponent<ComponentType<any>>,
  children?: RouteType[];
  [key: string]: any;
}

declare module 'virtual-routes' {
  import type { ComponentType, LazyExoticComponent } from 'react';

  const routes: RouteType[];

  export default routes;
}
