export function generateRouterTemplate(
  routes: string[],
  routeComponents: string[]
): string {
  const pkg = require('../package.json');
  return [
    '// @ts-nocheck',
    `// this file is generated by ${pkg.name}`,
    '// do not change anytime!',
    `import React, { Suspense } from 'react';`,
    '',
    'function withLazyLoad(LazyComponent) {',
    '  const lazyComponentWrapper = (props) => (',
    '    <Suspense fallback={props.loadingComponent}>',
    '      <LazyComponent {...props} />',
    '    </Suspense>',
    '  );',
    '  return lazyComponentWrapper;',
    '}',
    '',
    'export function getRoutes() {',
    `  const routes = {${routes.join(',')}};`,
    '  return {',
    '    routes,',
    '    routeComponents: {',
    `${routeComponents.join(',\n')}`,
    '    },',
    '  };',
    '}',
    '',
  ].join('\n');
}
