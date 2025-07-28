import { FrameworkEnum } from '../constant.js';
import { resolveReact } from './react.js';
import { resolveVue } from './vue.js';

import { ResolverType } from '../types/index.js';

export function getResolver(framework: FrameworkEnum): ResolverType {
  switch (framework) {
    case FrameworkEnum.REACT:
      return resolveReact();
    case FrameworkEnum.VUE:
      return resolveVue();
    default:
      throw new Error(`Framework ${framework} is not supported.`);
  }
}
