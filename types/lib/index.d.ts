declare const _exports: {
    manager(uri: any, opts: any): Manager;
    arrayWithSchema: any;
    close(): Promise<any>;
    _state: string;
    command(...args: any[]): any;
    connectionString(uri: any, databaseName: any): any;
    get(name: any, options: any): any;
    id: any;
    isId: any;
    models(pathname: any, opts?: {}): Promise<{}>;
    onError(fn: any): Promise<any>;
    onOpen(fn: any): Promise<any>;
    open(): Promise<Manager>;
    db: any;
    parseData: any;
    model: typeof import("./model");
    getSignedUrl: any;
    _getSignedUrl(): never;
    parseBracketNotation: any;
    parseBracketToDotNotation: any;
    parseDotNotation: any;
    rules: {
        required: {
            validateUndefined: boolean;
            validateNull: boolean;
            validateEmptyString: boolean;
            message: string;
            fn: (x: any) => boolean;
        };
        isBoolean: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isArray: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isDate: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isImageObject: {
            validateEmptyString: boolean;
            message: string;
            messageLong: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isInteger: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isNumber: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isObject: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isString: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        isAny: {
            validateEmptyString: boolean;
            message: string;
            fn: (x: any) => boolean;
        };
        isId: {
            validateEmptyString: boolean;
            message: string;
            tryParse: (x: any) => any;
            fn: (x: any) => boolean;
        };
        max: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => boolean;
        };
        min: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => boolean;
        };
        enum: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => boolean;
        };
        isAfter: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
        isBefore: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
        isCreditCard: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        isEmail: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        isHexColor: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        isIn: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
        isIP: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        isNotEmptyString: {
            validateEmptyString: boolean;
            message: string;
            fn: (x: any) => boolean;
        };
        isNotIn: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => boolean;
        };
        isURL: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        isUUID: {
            message: string;
            fn: (x: any, arg: any) => any;
        };
        minLength: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
        maxLength: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
        regex: {
            message: (x: any, arg: any) => string;
            fn: (x: any, arg: any) => any;
        };
    };
};
export = _exports;
export { rules };
import Manager = require("./manager");
import rules = require("./rules.js");
//# sourceMappingURL=index.d.ts.map