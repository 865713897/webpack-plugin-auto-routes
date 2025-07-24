import { FrameworkEnum } from '../constant.js';
import { resolveReact } from './react.js';
import { resolveVue } from './vue.js';

export function getResolver(framework: FrameworkEnum) {
  switch (framework) {
    case FrameworkEnum.REACT:
      return resolveReact();
    case FrameworkEnum.VUE:
      return resolveVue();
    default:
      throw new Error(`Framework ${framework} is not supported.`);
  }
}
