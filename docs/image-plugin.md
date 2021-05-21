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
      formats: ['jpg', 'jpeg', 'png', 'ico'] // optional, doesnt support txt based files e.g. svg, txt, ..
    }
  })
```

Then in your model schema, e.g.

```js
let user = db.model('user', { fields: {
  logo:  {
    type: 'image',
    formats: ['jpg', 'jpeg', 'webp', 'ico'], // optional plugin rule
    fileSize: 1000 * 1000 * 5 // optional plugin rule, size in bytes
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

...to be continued

