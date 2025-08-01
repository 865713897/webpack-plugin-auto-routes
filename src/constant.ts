export const DefaultIgnoreNames = [
  'component',
  'service',
  'util',
  'asset',
  'style',
  'type',
  'hook',
  'interface',
  'api',
  'constant',
  'model',
  'const',
];

export const frameworkMap = {
  REACT: 'react',
  VUE: 'vue',
} as const;

export const frameworkList = Object.values(frameworkMap);
