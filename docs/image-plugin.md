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

  Then when updating a document you need to pass an object containing your parsed files, [express-fileupload](https://github.com/richardgirges/express-fileupload) works great with an express setup, e.g.

  ```js
    user.update({
      query: id,
      data: req.body,
      files: req.files || {}
    })
  ```

  ...to be continued

