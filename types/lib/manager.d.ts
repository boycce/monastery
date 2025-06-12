export = Manager;
declare function Manager(uri: any, opts: any, parent: any): any;
declare class Manager {
    constructor(uri: any, opts: any, parent: any);
    manager(uri: any, opts: any): Manager;
    arrayWithSchema(array: any, schema: any): any;
    close(): Promise<any>;
    _state: string;
    command(...args: any[]): any;
    connectionString(uri: any, databaseName: any): any;
    get(name: any, options: any): any;
    id(str: any): import("bson").ObjectId;
    isId(value: any): boolean;
    models(pathname: any, opts?: {}): Promise<{}>;
    onError(fn: any): Promise<any>;
    onOpen(fn: any): Promise<any>;
    open(): Promise<Manager>;
    db: any;
    parseData(obj: any, parseBracketToDotNotation: any, parseDotNotation: any): any;
    model: typeof Model;
    getSignedUrl: (path: any, expires: number, bucket: any) => Promise<string>;
    _getSignedUrl(): never;
}
import Model = require("./model.js");
//# sourceMappingURL=manager.d.ts.map