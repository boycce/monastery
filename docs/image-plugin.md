---
title: Image Plugin
nav_order: 7
---

# Image Plugin

To use the default image plugin shipped with monastery, you need to use the options below when initialising a manager

```js
  let db = monastery('localhost/mydb', {
    imagePlugin: {
      awsAcl: 'public-read', // default
      awsBucket: 'your-bucket-name',
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
    }
  })
```

Then in your model definition, e.g.

```js
let user = db.model('user', {
  fields: {
    logo:  {
      type: 'image',
      // ...any imagePlugin option, excluding awsAccessKeyId and awsSecretAccessKey
    },
    logos: [{
      type: 'image',
      // ...any imagePlugin option, excluding awsAccessKeyId and awsSecretAccessKey
    }],
  }
})
```

Then when inserting or updating a document you need to set `files` to an obkect containing containing your parsed files, [express-fileupload](https://github.com/richardgirges/express-fileupload) works great with an express setup, e.g.

```js
user.update({
  query: id,
  data: req.body,
  files: req.files || {}
})
```

When updating, you need to make sure you always pass all of your image objects again back into `data` since any images not found will be removed automatically from your S3 bucket. A nice way to handle image/non-image updates is by appending `?files=true` to your API route calls, e.g.

```js
user.update({
  query: id,
  data: req.body,
  files: req.query.files? req.files : undefined
})
```

### File types

Due to known limitations, we are not able to verify the contents of non-binary files, only the filename extension (e.g. .txt, .svg) before uploading to S3

...to be continued

### Image sizes

I've put together a AWS Lambda function which you can use to generate small/medium/large image sizes automatically for any new files uploaded to your bucket.
[https://github.com/boycce/s3-lambda-thumbnail-generator#install-bucket](https://github.com/boycce/s3-lambda-thumbnail-generator#install-bucket)

You can override the function's default image sizes via the `metadata` option globally in the manager options, or per file:
```js
// Per file
let user = db.model('user', {
  fields: {
    logo:  {
      type: 'image',
      metadata: { small: '*x100', medium: '*x500', large: '*x900' },
    },
  }
}
```
