export const PAGE_FILE_REGEX = /.(jsx?|tsx?)$/;
export const ROUTE_PATH_REGEX = /(\/index)?.(jsx?|tsx?)$/;
export const META_FILE_REGEX = /\.meta\.json$/;
export const TYPE_FILE_REGEX = /\.d\.ts$/;
export const LAYOUT_FILE_REGEX =
  /layouts?(\.(jsx?|tsx)|[\\/]+index.(jsx?|tsx?))$/i;
export const LAYOUT_ID = '@@global-layout';
export const DEFAULT_IGNORED_NAMES = [
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
export const VIRTUAL_ALIAS = 'virtual_routes';
export const CWD = process.cwd();
