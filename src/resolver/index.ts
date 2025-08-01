import { frameworkMap } from '../constant.js';
import { resolveReact } from './react.js';
import { resolveVue } from './vue.js';

import { ResolverType, Framework } from '../types/index.js';

export function getResolver(framework: Framework): ResolverType {
  switch (framework) {
    case frameworkMap.REACT:
      return resolveReact();
    case frameworkMap.VUE:
      return resolveVue();
    default:
      throw new Error(`[webpack-plugin-auto-routes] Framework ${framework} is not supported.`);
  }
}
