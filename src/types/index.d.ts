export type DirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

export type FileItem = Omit<DirType, 'pattern'> & { files: string[] };

export type ResolverType = {
  suffix: string;
  isPageFile: (filePath: string) => boolean;
  isLayoutFile: (filePath: string) => boolean;
  generateTemplate: (input: string) => string;
};
