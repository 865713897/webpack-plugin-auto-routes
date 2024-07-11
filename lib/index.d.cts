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
interface IRoute {
    path: string;
    name: string;
    component: string;
    routes?: IRoute[];
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
    run(): Promise<void>;
    generateRoutes(appData: IAppData): Promise<void>;
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
    deepReadDirSync(root: string, deep: boolean): string[];
    getFiles(root: string, excludeFolders: string[], deep: boolean): string[];
    isValidFile(file: string, excludeFolders: string[]): boolean;
    filesToRoutes(files: string[], appData: IAppData): IRoute[];
    getRoutes({ appData }: {
        appData: IAppData;
    }): Promise<IRoute[]>;
    repeatString(str: string, times: number): string;
    generateChunkName(component: string): string;
    formatRoute(route: IRoute, level: number): string;
    renderRoutes(routes: IRoute[], level: number): any;
    getRoutesTemplate(routes: IRoute[], isTs: boolean, hasLayouts: boolean): string;
    getRouterComponentTemplate(isTs: boolean, indexPath: string, routerMode: string): string;
    generateRoutesFile({ appData, routes }: {
        appData: IAppData;
        routes: IRoute[];
    }): void;
    generateRouterComponent(appData: IAppData): void;
    writeToFileAsync(filePath: string, fileSuffix: string, content: string): void;
}

export { type IAppData, type IAutoRoutes, type IRoute, type Options, WebpackPluginAutoRoutes as default, type routingModeType };
