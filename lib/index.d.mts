import { Compiler } from 'webpack';

type routingModeType = 'browser' | 'hash';
interface IAutoRoutes {
    excludeFolders?: string[];
    routingMode?: routingModeType;
    onlyRoutes?: boolean;
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
    excludeFolders: string[];
    routingMode: 'browser' | 'hash';
    indexPath: string;
}
declare class WebpackPluginAutoRoutes {
    excludeFolders: string[];
    routingMode: routingModeType;
    onlyRoutes: boolean;
    indexPath: string;
    isTsComponent: boolean;
    hasLayouts: boolean;
    isDev: boolean;
    constructor(options: IAutoRoutes);
    apply(compiler: Compiler): void;
    run(): void;
    generateRoutes(appData: IAppData): void;
    getAppData({ cwd }: Options): {
        cwd: string;
        absSrcPath: string;
        absPagesPath: string;
        absNodeModulesPath: string;
        absRouterPath: string;
        absLayoutsPath: string;
        excludeFolders: string[];
        routingMode: routingModeType;
        indexPath: string;
    };
}

export { type IAppData, type IAutoRoutes, type Options, WebpackPluginAutoRoutes as default, type routingModeType };
