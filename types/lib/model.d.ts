export = Model;
declare function Model(name: any, definition: any, waitForIndexes: any, manager: any): Model | Promise<this>;
declare class Model {
    constructor(name: any, definition: any, waitForIndexes: any, manager: any);
    messages: {};
    fields: any;
    fieldsFlattened: {};
    modelFieldsArray: any[];
    collection: any;
    _getFieldsFlattened(fields: any, path: any): {};
    _getModelFieldsArray(): any[];
    _setupFields(fields: any, isSub: any): void;
    _removeInvalidRules(field: any): any;
    _setupIndexes(fields: any, opts?: {}): Promise<{
        name: string;
        key: {};
    }[]>;
    _callHooks(hookName: any, data: any, hookContext: any): Promise<any>;
    _defaultFields: {
        _id: {
            insertOnly: boolean;
            type: string;
        };
        createdAt: {
            default: (fieldName: any, model: any) => number;
            insertOnly: boolean;
            timestampField: boolean;
            type: string;
        };
        updatedAt: {
            default: (fieldName: any, model: any) => number;
            timestampField: boolean;
            type: string;
        };
    };
}
//# sourceMappingURL=model.d.ts.map