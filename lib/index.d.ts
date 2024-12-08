import { Compiler } from 'webpack';

type modeType = 'browser' | 'hash';
interface IAutoRoutes {
    context?: string;
    entry?: string;
    ignoreFolders?: string[];
    ignoreFiles?: string[];
    mode?: modeType;
    indexPath?: string;
}
interface Options {
    cwd: string;
}
interface IAppData {
    cwd: string;
    absSrcPath: string;
    absPagesPath: string;
    absRouterPath: string;
    absLayoutsPath: string;
    ignoreFolders: string[];
    ignoreFiles: string[];
    mode: 'browser' | 'hash';
    indexPath: string;
}
declare class WebpackPluginAutoRoutes {
    context: string;
    entry: string;
    ignoreFolders: string[];
    ignoreFiles: string[];
    mode: modeType;
    indexPath: string;
    isTsComponent: boolean;
    hasLayouts: boolean;
    isDev: boolean;
    constructor(options?: IAutoRoutes);
    apply(compiler: Compiler): void;
    private run;
    private getAppData;
    private generate;
}

export { type IAppData, type IAutoRoutes, type Options, WebpackPluginAutoRoutes as default, type modeType };
