// requiring: nanoid, file-type, aws-sdk/clients/s3
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const util = require('../../lib/util.js')

let plugin = module.exports = {

  setup: function(manager, options) {
    /**
     * Monastery plugin that allows models to automatically process and store uploaded images
     * e.g. fields.avatar: { image: true }
     *
     * Note we cannot accurately test for non binary file-types, e.g. 'txt', 'csv'
     *
     * @param {object} monastery manager instance
     * @param {options} options - plugin options
     */

    // Depreciation warnings
    if (options.bucketDir) { // > 1.36.2
      manager.warn('imagePlugin.bucketDir has been depreciated in favour of imagePlugin.path')
      options.path = function (uid, basename, ext, file) { `${options.bucketDir}/${uid}.${ext}` }
    }

    // Settings
    manager.imagePlugin = {
      _s3Client: null,
      awsAcl: options.awsAcl || 'public-read', // default
      awsBucket: options.awsBucket,
      awsAccessKeyId: options.awsAccessKeyId,
      awsSecretAccessKey: options.awsSecretAccessKey,
      awsRegion: options.awsRegion,
      bucketDir: options.bucketDir || 'full', // depreciated > 1.36.2
      filesize: options.filesize,
      formats: options.formats || ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff'],
      getSignedUrlOption: options.getSignedUrl,
      metadata: options.metadata ? util.deepCopy(options.metadata) : undefined,
      params: options.params ? util.deepCopy(options.params) : {},
      path: options.path || function (uid, basename, ext, file) { return `full/${uid}.${ext}` },
    }

    if (!options.awsBucket || !options.awsAccessKeyId || !options.awsSecretAccessKey) {
      throw new Error('Monastery imagePlugin: awsRegion, awsBucket, awsAccessKeyId, or awsSecretAccessKey is not defined')
    }
    if (!options.awsRegion) {
      throw new Error('Monastery imagePlugin: v3 requires awsRegion to be defined for signing urls, e.g. \'ap-southeast-2\'')
    }

    // Create s3 'service' instance (defer require since it takes 120ms to load)
    // v2: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
    // v3: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
    // v3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
    manager.imagePlugin.getS3Client = (useRegion) => {
      const { S3 } = require('@aws-sdk/client-s3')
      const key  = '_s3Client'// useRegion ? '_s3ClientRegional' : '_s3Client'
      return manager.imagePlugin[key] || (manager.imagePlugin[key] = new S3({
        // ...(region: useRegion ? this.awsRegion : undefined,
        region: manager.imagePlugin.awsRegion, // if region is missing it throws an error, but only in production...
        credentials: {
          accessKeyId: manager.imagePlugin.awsAccessKeyId,
          secretAccessKey: manager.imagePlugin.awsSecretAccessKey,
        },
      }))
    }

    // Add before model hook
    manager.beforeModel.push(plugin.setupModel)
  },

  setupModel: function(model) {
    /**
     * Cache all model image paths for a model and add monastery operation hooks
     * Todo: need to test the model hook arguement signatures here
     * @param {object} model
     * @this {object} - null
     */
    model.imageFields = plugin._findAndTransformImageFields.call(model, model.fields, '')

    if (model.imageFields.length) {
      // Todo?: Update image fields / blacklists with the new object schema
      //   model._setupFields(model.fields)/model._getFieldsFlattened(model.fields)
      model.beforeValidate.push(function(data, n) {
        plugin.keepImagePlacement.call(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.beforeUpdate.push(function(data, n) {
        plugin.removeImages.call(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.beforeRemove.push(function(n) {
        plugin.removeImages.call(this, {}).then(() => n(null, {})).catch(e => n(e))
      })
      model.afterUpdate.push(function(data, n) {
        plugin.addImages.call(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.afterInsert.push(function(data, n) {
        plugin.addImages.call(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.afterFind.push(function(data, n) {
        plugin.getSignedUrls.call(this, data).then(() => n(null, data)).catch(e => n(e))
      })
    }
  },

  addImages: function(data, test) {
    /**
     * Hooked after create/update
     * Uploads viable images and saves their details on the model. AWS Lambda takes
     * care of resizing the images. Addimages() is hooked after which prevents unnecessary
     * uploads if model validation errors arise.
     *
     * Function logic
     * 1. Filter files by valid image fields ({ type: 'image' })
     * 2. Check file sizes
     * 3. Save each file to S3
     * 4. Save each S3 file info on the data
     *
     * AWS speed tests
     * 2mb: 1864ms, 1164ms
     * 0.1mb: 480ms
     *
     * @param {object} data -
     * @param {boolean} test -
     * 
     * @return promise(
     *   {object} data - data object containing new S3 image-object
     * ])
     * @this {object} - monastery operation options {model, query, files, create, multi }
     */
    const { model, query, files, create, multi } = this
    const imagePlugin = model.manager.imagePlugin
    if (!files) return Promise.resolve([])

    // Build an ID query from query/data. Inserts add _id to the data automatically.
    const idquery = query && query._id? query : { _id: data._id }

    // We currently don't support an array of data objects.
    if (util.isArray(data)) {
      return Promise.reject('Adding images to mulitple data objects is not supported.')

    // We currently don't support an array of data objects.
    } else if (!util.isObject(data)) {
      return Promise.reject('No creat e/ update data object passed to addImages?')

    // We require the update query OR data object to contain _id. This is because non-id queries
    // will not suffice when updating the document(s) against the same query again.
    } else if (!(data||{})._id && (!query || !query._id)) {
      return Promise.reject('Adding images requires the update operation to query via _id\'s.')
    }

    // Find valid images and upload to S3, and update data with image objects
    return plugin._findValidImages.call(model, files).then(files => {
      return Promise.all(files.map(filesArr => {
        return Promise.all(filesArr.map(file => {
          return new Promise((resolve, reject) => {
            let uid = require('nanoid').nanoid()
            let path = filesArr.imageField.path || imagePlugin.path
            let image = {
              bucket: filesArr.imageField.awsBucket || imagePlugin.awsBucket,
              date: model.manager.opts.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000),
              filename: file.name,
              filesize: file.size,
              metadata: filesArr.imageField.metadata || imagePlugin.metadata,
              path: path(uid, file.name, file.ext, file),
              uid: uid,
            }
            let s3Options = {
              // ACL: Some IAM permissions "s3:PutObjectACL" must be included in the policy
              // params: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
              ACL: filesArr.imageField.awsAcl || imagePlugin.awsAcl,
              Body: file.data,
              Bucket: image.bucket,
              Key: image.path,
              Metadata: image.metadata,
              ...(filesArr.imageField.params || imagePlugin.params),
            }
            model.manager.info(
              `Uploading '${image.filename}' to '${image.bucket}/${image.path}'`
            )
            if (test) {
              plugin._addImageObjectsToData(filesArr.inputPath, data, image)
              resolve(s3Options)
            } else {
              const { Upload } = require('@aws-sdk/lib-storage')
              const upload = new Upload({
                client: imagePlugin.getS3Client(),
                params: s3Options,
              })
              // upload.on('httpUploadProgress', (progress) => {
              //   console.log(progress)
              // })
              upload.done()
                .then((res) => {
                  plugin._addImageObjectsToData(filesArr.inputPath, data, image)
                  resolve(s3Options)
                })
                .catch((err) => {
                  reject(err)
                })
            }
          })
        }))
      }))

    // Save the data against the matching document(s)
    }).then((s3Options) => {
      let prunedData = { ...data }
      // Remove update's _output object
      delete prunedData._output
      if (test) return [prunedData, s3Options]
      return model._update(
        idquery,
        { '$set': prunedData },
        { 'multi': multi || create }
      )

    // If errors, remove inserted documents to prevent double ups when the user resaves.
    // We are pretty much trying to emulate a db transaction.
    }).catch(err => {
      if (create) model._remove(idquery)
      throw err
    })
  },

  getSignedUrl: async function(path, expires=3600, bucket) {
    /**
     * @param {string} path - aws file path
     * @param {number} <expires> - seconds
     * @param {string} <bucket>
     * 
     * @return {promise} signedUrl
     * @see v2: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
     * @see v3: https://github.com/aws/aws-sdk-js-v3/blob/main/UPGRADING.md#s3-presigned-url
     * 
     * @this manager
     */
    const { imagePlugin } = this
    if (!imagePlugin) {
      throw new Error(
        'You must call getSignedUrl() with a manager as the context. The manager also needs to have the imagePlugin setup too, ' +
        'e.g. `monastery(..., { imagePlugin })`'
      )
    }
    const { GetObjectCommand } = require('@aws-sdk/client-s3')
    const params = { Bucket: bucket || imagePlugin.awsBucket, Key: path }
    const command = new GetObjectCommand(params)
    let signedUrl = await getSignedUrl(imagePlugin.getS3Client(true), command, { expiresIn: expires })
    // console.log(signedUrl)
    return signedUrl
  },

  getSignedUrls: async function(data) {
    /**
     * Get signed urls for all image objects in data
     * 
     * @param {object} data
     * 
     * @return promise() - mutates data
     * @this {object} - monastery operation options {model, query, files, ..}
     */
    // Not wanting signed urls for this operation?
    const { getSignedUrls, model } = this
    const imagePlugin = model.manager.imagePlugin
    if (util.isDefined(getSignedUrls) && !getSignedUrls) return

    // Find all image objects in data
    for (let doc of util.toArray(data)) {
      for (let imageField of model.imageFields) {
        if (getSignedUrls
            || (util.isDefined(imageField.getSignedUrl) ? imageField.getSignedUrl : imagePlugin.getSignedUrlOption)) {
          let images = plugin._findImagesInData(doc, imageField, 0, '').filter(o => o.image)
          // todo: we could do this in parallel
          for (let image of images) {
            image.image.signedUrl = await plugin.getSignedUrl.call(model.manager, image.image.path, 3600, imageField.awsBucket)
          }
        }
      }
    }
  },

  keepImagePlacement: async function(data) {
    /**
     * Hook before update/remove
     * Since monastery removes undefined array items on validate, we need to convert any
     * undefined array items to null where files are located to maintain image ordering
     * Todo: maybe dont remove undefined array items in general
     *
     * E.g.
     * req.body  = 'photos[0]' : undefined || non existing (set to null)
     * req.files = 'photos[0]' : { ...binary }
     *
     * @return promise
     * @this {object} - monastery operation options {query, model, files, multi, ..}
     */
    const { model, files } = this
    if (typeof files == 'undefined') return
    // Check upload errors and find valid uploaded images
    let validFiles = await plugin._findValidImages.call(model, files || {})
    // Set undefined primative-array items to null where files are located
    for (let item of validFiles) {
      if (item.inputPath.match(/\.[0-9]+$/)) {
        util.setDeepValue(data, item.inputPath, null, true, false, true)
      }
    }
  },

  removeImages: async function(data, test) {
    /**
     * Hook before update/remove
     * Removes images not found in data, this means you will need to pass the image objects to every update operation
     *
     * Function logic
     * 1. Find all pre-existing image objects in the documents from the same query
     * 3. Check if data contains null/missing or valid pre-existing images and update useCount accordingly
     * 3. delete leftovers from S3
     *
     * @ref https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
     * @return promise([
     *   {object} useCount - images that wont be removed, e.g. { lion1: 1 }
     *   {array} unused - S3 image uris to be removed,  e.g. [{ Key: 'small/lion1.jpg' }, ..]
     * ])
     * @this {object} - monastery operation options {query, model, files, multi, ..}
     */
    let pre
    const preExistingImages = []
    const useCount = {}
    const { model, files, query } = this
    const imagePlugin = model.manager.imagePlugin
    if (typeof files == 'undefined') return

    // Find all documents from the same query
    const docs = await model._find(query, this)

    // Find all pre-existing image objects in documents
    for (let doc of util.toArray(docs)) { //x2
      for (let imageField of model.imageFields) { //x5
        let images = plugin._findImagesInData(doc, imageField, 0, '').filter(o => o.image)
        for (let image of images) {
          preExistingImages.push(image)
          useCount[image.image.uid] = (useCount[image.image.uid] || 0) + 1
        }
      }
    }

    // console.log(1, useCount, preExistingImages)

    // Assign pre-existing images within undefined deep objects and missing array items to null,
    // ignore undefined root images
    let dataFilled = util.deepCopy(data)
    for (let key in dataFilled) {
      for (let pre of preExistingImages) {
        if (!pre.dataPath.match(new RegExp('^' + key + '(\\.|$)'))) continue
        util.setDeepValue(dataFilled, pre.dataPath, null, true)
      }
    }
    // console.log(dataFilled)

    // Check upload errors and find valid uploaded images
    let validFiles = await plugin._findValidImages.call(model, files || {})

    // Loop all schema image fields
    for (let imageField of model.imageFields) { //x5
      let images = plugin._findImagesInData(dataFilled, imageField, 0, '')
      if (!images.length) continue
      // console.log(images)

      // Data contains null images that once had a pre-existing image
      for (let image of images) {
        if (image.image == null && (pre = preExistingImages.find(o => o.dataPath == image.dataPath))) {
          useCount[pre.image.uid]--
        }
      }

      // Loop images found in the data
      for (let image of images) {
        if (image.image != null) {
          let preExistingImage = preExistingImages.find(o => o.dataPath == image.dataPath)
          // valid image-object?
          if (typeof useCount[image.image.uid] == 'undefined') {
            throw `The passed image object for '${image.dataPath}' does not match any pre-existing
              images saved on this document. Make sure that this image dosen't come from another document or 
              collection, and is indeed saved on this document.`
          // Different image from prexisting image
          } else if (preExistingImage && preExistingImage.image.uid != image.image.uid) {
            useCount[preExistingImage.image.uid]--
            useCount[image.image.uid]++
          // No pre-existing image found
          } else if (!preExistingImage) {
            useCount[image.image.uid]++
          }
          // Any file overriding this image?
          for (let item of validFiles) {
            if (image.dataPath == item.inputPath) {
              useCount[image.image.uid]--
            }
          }
        }
      }
    }

    // Retrieve all the unused files
    // console.log(3, useCount)
    let unused = []
    for (let key in useCount) {
      if (useCount[key] > 0) continue
      let pre = preExistingImages.find(o => o.image.uid == key)
      unused.push(
        // original key can have a different extension, but always expect generated assets
        // to be in jpg
        { Key: pre.image.path },
        { Key: `small/${key}.jpg` },
        { Key: `medium/${key}.jpg` },
        { Key: `large/${key}.jpg` }
      )
      model.manager.info(
        `Removing '${pre.image.filename}' from '${pre.image.bucket}/${pre.image.path}'`
      )
    }
    if (test) return [useCount, unused]
    // Delete any unused images from s3. If the image is on a different bucket
    // the file doesnt get deleted, we only delete from imagePlugin.awsBucket.
    if (!unused.length) return
    await new Promise((resolve, reject) => {
      imagePlugin.getS3Client().deleteObjects({
        Bucket: imagePlugin.awsBucket,
        Delete: { Objects: unused },
      }, (err, data) => {
        if (err) reject(err)
        resolve()
      })
    })
  },

  _addImageObjectsToData: function(path, data, image) {
    /**
     * Push or save new image object to data
     * @param {string} path
     * @param {object} data
     * @param {object} image
     * @return mutates data
     * @this null
     */
    let chunks = path.split('.')
    let target = data
    for (let i=0, l=chunks.length; i<l; i++) {
      if (i === l-1) {
        target[chunks[i]] = image

      } else if (chunks[i+1].match(/^[0-9]+$/)) { // parent array
        if (!util.isArray(target[chunks[i]])) target = target[chunks[i]] = []
        else target = target[chunks[i]]

      } else {
        if (!util.isObject(target[chunks[i]])) target = target[chunks[i]] = {}
        else target = target[chunks[i]]
      }
    }
    return data
  },

  _findValidImages: function(files) {
    /**
     * Find and return valid uploaded files
     * @param {object} files - req.files
     * @return promise([
     *   [{..file}, .imageField, .inputPath],
     *   ..
     * ])
     * @this model
     */
    let validFiles = []
    const { imageFields, manager } = this
    const imagePlugin = manager.imagePlugin

    // Filter valid image files by `type='image'`, convert file keys to dot notation, and force array
    for (let key in files) {
      let key2 = key.replace(/\]/g, '').replace(/\[/g, '.')
      let imageField = imageFields.find(o => key2.match(o.fullPathRegex))
      if (imageField) {
        let filesArr = util.toArray(files[key])
        filesArr.imageField = imageField
        filesArr.inputPath = key2
        validFiles.push(filesArr)
      }
    }

    if (!validFiles.length) return Promise.resolve([])

    // Validate the uploaded images
    return Promise.all(validFiles.map(filesArr => {
      return Promise.all(filesArr.map((file, i) => {
        return new Promise((resolve, reject) => {
          require('file-type').fromBuffer(file.data).then(res => {
            let filesize = filesArr.imageField.filesize || imagePlugin.filesize
            let formats = filesArr.imageField.formats || imagePlugin.formats
            let allowAny = util.inArray(formats, 'any')
            file.format = res? res.ext : ''
            file.ext = file.format || (file.name.match(/\.(.*)$/) || [])[1] || 'unknown'
            file.nameClipped = file.name.length > 14? file.name.substring(0, 14) + '..' : file.name

            if (file.truncated) reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file size for '${file.nameClipped}' is too big.`,
            })
            else if (filesize && filesize < file.size) reject({ // file.size == bytes
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file size for '${file.nameClipped}' is bigger than ${(filesize/1000/1000).toFixed(1)}MB.`,
            })
            else if (file.ext == 'unknown') reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `Please add a file extension to your file '${file.nameClipped}'`,
            })
            else if (!allowAny && !util.inArray(formats, file.ext)) reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file format '${file.ext}' for '${file.nameClipped}' is not supported`,
            })
            else resolve()
          })
        })
      }))
    })).then(() => validFiles)
  },

  _findAndTransformImageFields: function(unprocessedFields, path) {
    /**
     * Returns a list of valid image field schemas
     * @param {object|array} unprocessedFields - fields not yet setup
     * @param {string} path
     * @return [{}, ...]
     * @this model
     */
    let list = []
    const { manager } = this
    const imagePlugin = manager.imagePlugin
    util.forEach(unprocessedFields, (field, fieldName) => {
      let path2 = `${path}.${fieldName}`.replace(/^\./, '')
      if (fieldName == 'schema') return

      // Subdocument field
      if (util.isSubdocument(field)) {
        // log(`Recurse 1: ${path2}`)
        list = list.concat(plugin._findAndTransformImageFields.call(this, field, path2))

      // Array field
      } else if (util.isArray(field)) {
        // log(`Recurse 2: ${path2}`)
        list = list.concat(plugin._findAndTransformImageFields.call(this, field, path2))

      // Image field. Test for field.image as field.type may be 'any'
      } else if (field.type == 'image' || field.image) {
        if (field.fileSize) { // > v1.31.7
          this.manager.warn(`${path2}.fileSize has been depreciated in favour of ${path2}.filesize`)
          field.filesize = field.filesize || field.fileSize
        }
        if (field.filename) { // > v1.36.3
          this.manager.warn(`${path2}.filename has been depreciated in favour of ${path2}.path()`)
          field.path = field.path || function(uid, basename, ext, file) { 
            return `${imagePlugin.bucketDir}/${uid}/${field.filename}.${ext}` 
          }
        }

        list.push({
          awsAcl: field.awsAcl,
          awsBucket: field.awsBucket,
          filename: field.filename,
          filesize: field.filesize,
          formats: field.formats,
          fullPath: path2,
          fullPathRegex: new RegExp('^' + path2.replace(/\.[0-9]+/g, '.[0-9]+').replace(/\./g, '\\.') + '$'),
          getSignedUrl: field.getSignedUrl,
          metadata: field.metadata ? util.deepCopy(field.metadata) : undefined,
          path: field.path,
          params: field.params ? util.deepCopy(field.params) : undefined,
        })
        // Convert image field to subdocument
        unprocessedFields[fieldName] = {
          bucket: { type: 'string' },
          date: { type: 'number' },
          filename: { type: 'string' },
          filesize: { type: 'number' },
          metadata: { type: 'any' },
          path: { type: 'string' },
          uid: { type: 'string' },
          schema: { image: true, isImageObject: true, nullObject: true, default: undefined },
        }
      }
    })
    return list
  },

  _findImagesInData: function(target, imageField, imageFieldChunkIndex, dataPath) {
    /**
     * Recurse and find field images in data. If the image field is null, it returns null
     * @param {object|array} target - data to search
     * @param {object} imageField - imageField to find
     * @param {number} imageFieldChunkIndex - imageField path chunk index
     * @param {string} dataPath
     * @return [{ imageField: {}, dataPath: '', image: {} }, ..]
     * @this null
     */
    let list = []
    let chunks = imageField.fullPath.split('.').slice(imageFieldChunkIndex)

    for (let i=0, l=chunks.length; i<l; i++) {
      let newDataPath = `${dataPath}.${chunks[i]}`.replace(/^\./, '')

      // loop data arrays
      if (chunks[i].match(/^[0-9]+$/) && util.isArray(target)) {
        for (let m=0, n=target.length; m<n; m++) {
          if (`${dataPath}.${m}`.match(imageField.fullPathRegex)) {
            list.push({ imageField: imageField, dataPath: `${dataPath}.${m}`, image: target[m] })
          } else {
            list.push(...plugin._findImagesInData(
              target[m],
              imageField,
              imageFieldChunkIndex+i+1,
              `${dataPath}.${m}`
            ))
          }
        }

      // More chunks?
      } else if (i !== l-1) {
        dataPath = newDataPath
        target = target? target[chunks[i]] : null

      // Last chunk, does it match?
      } else if (newDataPath.match(imageField.fullPathRegex)) {
        list.push({ imageField: imageField, dataPath: newDataPath, image: target? target[chunks[i]] : null })
      }
    }

    return list
  },
}
