---
title: Image Plugin
nav_order: 7
---

# Image Plugin

To use the default image plugin shipped with monastery, you need to use the options below when initialising a manager



```js
  let db = monastery('localhost/mydb', {
    imagePlugin: {
      awsBucket: 'your-bucket-name',
      awsAccessKeyId: 'your-key-here',
      awsSecretAccessKey: 'your-key-here',
      bucketDir: 'full', // default
      formats: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff'] // or 'any' to include everything
    }
  })
```

Then in your model schema, e.g.

```js
let user = db.model('user', { fields: {
  logo:  {
    type: 'image', // required
    formats: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff'],
    filename: 'avatar',
    filesize: 1000 * 1000 * 5, // max size in bytes
    getSignedUrl: true, // get a s3 signed url after `find()` operations
    params: {}, // upload params, https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  },
  logos: [{
    type: 'image'
  }],
}})
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

Due to known limitations, we are inaccurately able to validate non-binary file types (e.g. txt, svg) before uploading to S3, and rely on their file processing to remove any malicious files.

...to be continued
