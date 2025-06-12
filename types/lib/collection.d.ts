export = Collection;
declare function Collection(manager: any, name: any, options: any): void;
declare class Collection {
    constructor(manager: any, name: any, options: any);
    col: any;
    manager: any;
    name: any;
    options: any;
    _middleware(args: any): Promise<any>;
    aggregate(stages: any, opts: any): Promise<any>;
    bulkWrite(operations: any, opts: any): Promise<any>;
    count(query: any, opts: any): Promise<any>;
    createIndex(indexSpec: any, opts: any): Promise<any>;
    createIndexes(indexSpecs: any, opts: any): Promise<any>;
    distinct(field: any, query: any, opts: any): Promise<any>;
    drop(): Promise<string>;
    dropIndex(name: any, opts: any): Promise<any>;
    dropIndexes(): Promise<any>;
    find(query: any, opts: any): Promise<any>;
    findOne(query: any, opts: any): Promise<any>;
    findOneAndDelete(query: any, opts: any): Promise<any>;
    findOneAndUpdate(query: any, update: any, opts: any): Promise<any>;
    geoHaystackSearch(x: any, y: any, opts: any): Promise<never>;
    indexInformation(opts: any): Promise<any>;
    indexes(opts: any): Promise<any>;
    insert(data: any, opts: any): Promise<any>;
    mapReduce(map: any, reduce: any, opts: any): Promise<never>;
    remove(query: any, opts: any): Promise<any>;
    stats(opts: any): Promise<any>;
    update(query: any, update: any, opts: any): Promise<any>;
}
//# sourceMappingURL=collection.d.ts.map