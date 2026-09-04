---
title: File Plugin
nav_order: 7
has_children: true
---

# File Plugin

Monastery ships with a plugin that uploads files to S3 and saves a file object on your document. It works with any file type, e.g. images, PDFs, spreadsheets and documents, and has first class support for images, see [Images](#images). By default only image formats are allowed, use the `formats` option to allow other types.

*v5 renamed the image plugin to the file plugin, see [migrating from the image plugin](./file-plugin-migration).*

To use the plugin, add the options below when initialising a manager

```js
  let db = monastery('localhost/mydb', {
    filePlugin: {
      awsAcl: 'public-read', // default
      awsBucket: 'your-bucket-name',
      awsRegion: undefined, // e.g. 'ap-southeast-2'
      awsAccessKeyId: 'your-key-here',
      awsSecretAccessKey: 'your-key-here',
      filesize: undefined, // default (max filesize in bytes)
      formats: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff'], // default (use 'any' to allow all extensions)
      getSignedUrl: false, // default (get a S3 signed url after `model.find()`, can be defined per request)
      path: (uid, basename, ext, file) => `/full/${uid}.${ext}`, // default
      metadata: {},
      // Any s3 upload param, which takes precedence over the params above
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property)
      params: {},
      // Called after each file is uploaded to S3, before DB update, see "afterUploadBeforeUpdate" below
      afterUploadBeforeUpdate: [ async (ctx) => {} ],
      // Called after each file is uploaded to S3, after DB update, see "afterUploadAfterUpdate" below
      afterUploadAfterUpdate: [ async (ctx) => {} ],
    }
  })
```

Then add file fields to your model, e.g.

```js
let user = db.model('user', {
  fields: {
    logo:  {
      type: 'file',
      // ...any filePlugin option, excluding awsAccessKeyId and awsSecretAccessKey
    },
    logos: [{
      type: 'file',
      // ...any filePlugin option, excluding awsAccessKeyId and awsSecretAccessKey
    }],
    // Non-image files need to be allowed via `formats`
    resume: {
      type: 'file',
      formats: ['pdf', 'doc', 'docx'],
    },
    report: {
      type: 'file',
      formats: ['csv', 'xlsx'],
      filesize: 1000 * 1000 * 5, // 5MB
    },
    attachment: {
      type: 'file',
      formats: ['any'],
    },
  }
})
```

Then when inserting or updating, pass your parsed files via `options.files`. [express-fileupload](https://github.com/richardgirges/express-fileupload) works great with express, e.g.

```js
user.update({
  query: id,
  data: req.body,
  files: req.files || {}
})
```

### File object

After upload, the field is set to a file object, e.g.

```js
{
  bucket: 'your-bucket-name',
  date: 1700000000,        // upload time (seconds, or ms with `useMilliseconds`)
  filename: 'resume.pdf',  // original filename
  filesize: 48213,         // bytes
  metadata: undefined,     // the `metadata` option
  path: 'full/V1StGXR8_Z5jdHi6B-myT.pdf', // S3 key, from the `path` option
  uid: 'V1StGXR8_Z5jdHi6B-myT',
  signedUrl: 'https://...' // only with `getSignedUrl`
}
```

### Updating documents

When updating with `options.files`, **always** include previously uploaded file objects in `options.data`, otherwise they are removed from your S3 bucket (the plugin compares against the previous document).

You can reuse a file object on other file fields of the same document, but not across documents or collections.

Leaving `options.files` undefined skips all file processing. A nice way to separate file and non-file updates is a `?files=true` query on your API route, e.g.

```js
user.update({
  query: id,
  data: req.body,
  files: req.query.files? req.files : undefined
})
```

### File types

Uploads are checked against `formats` (per field, or the manager option). The default only allows images, `['any']` allows everything.

Binary files (images, pdf, docx, xlsx, zip, mp4, etc.) are identified by their contents using [file-type](https://github.com/sindresorhus/file-type/tree/v16.5.4#supported-file-types), not their filename. Text files (csv, txt, svg, json, etc.) can't be, so the filename extension is used instead.

Files without an extension are rejected.

The S3 `ContentType` is set automatically from the detected type. You can override it via `params`, e.g. `params: { ContentType: 'text/plain' }`.

### Images

Images are the plugin's main use case and work out of the box:

- The default `formats` only allow images, so a plain `{ type: 'file' }` field is an image field. Add `webp`, `svg`, `heic`, etc to `formats` as needed.
- Image contents are checked before upload, so the real image type is validated regardless of the filename.
- Signed URLs for private buckets via the `getSignedUrl` option.
- Automatic small/medium/large sizes, see [Image sizes](#image-sizes).

```js
let user = db.model('user', {
  fields: {
    avatar: { type: 'file' },
    photos: [{ type: 'file', formats: ['jpg', 'jpeg', 'png', 'webp'], filesize: 1000 * 1000 * 10 }],
  }
})
```

### Image sizes

I've put together an AWS Lambda function which generates small/medium/large image sizes for new files uploaded to your bucket. Non-image files are ignored and stored as is.
[https://github.com/boycce/s3-lambda-thumbnail-generator](https://github.com/boycce/s3-lambda-thumbnail-generator#install-bucket)

You can override the default sizes via the `metadata` option, globally or per field:
```js
// Per file
let user = db.model('user', {
  fields: {
    logo:  {
      type: 'file',
      metadata: { small: '*x300', medium: '*x800', large: '*x1200' },
    },
  }
}
```

### afterUploadBeforeUpdate

Same pattern as **[Operation hooks](./definition/#operation-hooks)**: an array of functions run in order, **once per uploaded file**, after the file object is set on `data` but before the document is updated. Rejecting prevents the document update.

One argument `ctx`: 
  - **`model`**: model instance
  - **`data`**: the validated insert/update data, already containing the new file object at `inputPath`
  - **`fileObject`**: stored file object (`bucket`, `path`, `uid`, `filename`, `filesize`, `date`, …)
  - **`file`**: parsed upload (`name`, `size`, `data`, `ext`, …)
  - **`fileField`**: resolved field settings for this path (`formats`, overrides, `fullPath`, …)
  - **`inputPath`**: dot path for this upload, e.g. `logo`, `photos.0`
  - **`query`**: operation query
  - **`create`**: true for inserts
  - **`multi`**: multi flag from the operation
  - **`test`**: true when running in test/dry mode
  - **`s3Result`**: AWS `upload.done()` result, undefined in test mode

### afterUploadAfterUpdate

Same as `afterUploadBeforeUpdate`, but runs **after** the document has been updated in the DB. Does not fire in test mode.

`ctx` is identical to `afterUploadBeforeUpdate`, minus `test`, plus:
  - **`updateResult`**: return value from `model._update()`
