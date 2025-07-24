export type DirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

export type FileItem = Omit<DirType, 'pattern'> & { files: string[] };
