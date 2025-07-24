import React from 'react';
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';
import routes from 'virtual-routes';
import withProtected from './ProtectedRoute';

export default function AppRouter() {
  const renderRoutes = (routes: RouteType[]) => {
    return routes?.map((route) => {
      const { id, path, Component, children = [] } = route;
      const ProtectedComponent = withProtected(Component);
      return (
        <Route key={id} path={path} element={<ProtectedComponent />}>
          {renderRoutes(children)}
        </Route>
      );
    });
  };

  return (
    <Router>
      <Routes>
        {renderRoutes(routes)}
        <Route path='*' element={<Navigate to='/404' />} />
      </Routes>
    </Router>
  );
}
