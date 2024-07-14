import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';

function withLazyLoad(LazyComponent) {
  const lazyComponentWrapper = (props) => (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return lazyComponentWrapper;
}

export function getRoutes() {
  const routes = [
    {
      path: '/',
      name: '@@global-layout',
      Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__layouts__index" */ '../layouts/index.jsx'))),
      children: [{
        path: '',
        name: 'redirect',
        Component: () => <Navigate to='/home' replace />,
      },{
        path: '/home',
        name: 'home',
        Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__home__index" */ '../pages/home/index.jsx'))),
        children: []
      },{
        path: '/login',
        name: 'login',
        Component: withLazyLoad(React.lazy(() => import(/* webpackChunkName: "src__pages__login__index" */ '../pages/login/index.jsx'))),
        children: []
      }]
    }
  ];
  return routes;
}
