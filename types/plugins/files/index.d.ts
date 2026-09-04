export function setup(manager: any, options: any): void;
export function setupModel(model: any): void;
export function addFiles(data: any, test: any): any;
export function _invokeAfterUploadBeforeUpdate(payload: any): Promise<void>;
export function _invokeAfterUploadAfterUpdate(payloads: any, updateResult: any): Promise<void>;
export function getSignedUrl(path: any, expires: number, bucket: any): Promise<string>;
export function getSignedUrls(data: any): Promise<void>;
export function keepFilePlacement(data: any): Promise<void>;
export function removeFiles(data: any, test: any): Promise<{}[]>;
export function _addFileObjectsToData(path: any, data: any, fileObject: any): any;
export function _findValidFiles(files: any): Promise<any[]>;
export function _findAndTransformFileFields(unprocessedFields: any, path: any): any[];
export function _findFilesInData(target: any, fileField: any, fileFieldChunkIndex: any, dataPath: any): any;
//# sourceMappingURL=index.d.ts.map