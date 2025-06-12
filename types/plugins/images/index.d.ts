export function setup(manager: any, options: any): void;
export function setupModel(model: any): void;
export function addImages(data: any, test: any): any;
export function getSignedUrl(path: any, expires: number, bucket: any): Promise<string>;
export function getSignedUrls(data: any): Promise<void>;
export function keepImagePlacement(data: any): Promise<void>;
export function removeImages(data: any, test: any): Promise<{}[]>;
export function _addImageObjectsToData(path: any, data: any, image: any): any;
export function _findValidImages(files: any): Promise<any[]>;
export function _findAndTransformImageFields(unprocessedFields: any, path: any): any[];
export function _findImagesInData(target: any, imageField: any, imageFieldChunkIndex: any, dataPath: any): any;
//# sourceMappingURL=index.d.ts.map