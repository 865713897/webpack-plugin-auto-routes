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
  const routes = {'home':{'path':'/home','id':'home','name':'home'}};
  return {
    routes,
    routeComponents: {
      'home':withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__home__index" */ '../pages/home/index.tsx')))
    },
  };
}
