export type dirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

export type fileListType = Omit<dirType, 'pattern'> & { files: string[] };
