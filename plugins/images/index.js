let fileType = require('file-type')
let nanoid = require('nanoid')
let S3 = require('aws-sdk/clients/s3')
let util = require('../../lib/util')

let plugin = module.exports = {

  setup: function(manager, options) {
    /**
     * Monastery plugin that allows models to automatically process and store uploaded images
     * e.g. fields.avatar: { image: true }
     * e.g. fields.photos: [{ image: true, //sizes: { large: [800,  600], .. } (not implemented) }]
     *
     * Note we cannot accurately test for non binary file-types, e.g. 'txt', 'csv'
     *
     * @param {object} monastery manager instance
     * @param {options} options - plugin options
     * @this plugin
     */

    // Settings
    this.awsBucket = options.awsBucket
    this.awsAccessKeyId = options.awsAccessKeyId
    this.awsSecretAccessKey = options.awsSecretAccessKey
    this.bucketDir = options.bucketDir || 'full'
    this.formats = options.formats || ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff']
    this.manager = manager

    if (!options.awsBucket || !options.awsAccessKeyId || !options.awsSecretAccessKey) {
      manager.error('Monastery imagePlugin: awsBucket, awsAccessKeyId, or awsSecretAccessKey is not defined')
      delete manager.imagePlugin
      return
    }

    // Create s3 'service' instance
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
    this.s3 = new S3({
      credentials: {
        accessKeyId: this.awsAccessKeyId,
        secretAccessKey: this.awsSecretAccessKey
      }
    })

    // Add before model hook
    manager.beforeModel.push(this.setupModel.bind(this))
  },

  setupModel: function(model) {
    /**
     * Cache all model image paths for a model and add monastery operation hooks
     * Todo: need to test the model hook arguement signatures here
     * @param {object} model
     * @this plugin
     */
    model.imageFields = plugin._findAndTransformImageFields(model.fields, '')

    if (model.imageFields.length) {
      // Todo?: Update image fields and whitelists with the new object schema
      //   model._setupFieldsAndWhitelists(model.fields)
      model.beforeValidate.push(function(data, n) {
        plugin.keepImagePlacement(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.beforeUpdate.push(function(data, n) {
        plugin.removeImages(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.beforeRemove.push(function(n) {
        plugin.removeImages(this, {}).then(() => n(null, {})).catch(e => n(e))
      })
      model.afterUpdate.push(function(data, n) {
        plugin.addImages(this, data).then(() => n(null, data)).catch(e => n(e))
      })
      model.afterInsert.push(function(data, n) {
        plugin.addImages(this, data).then(() => n(null, data)).catch(e => n(e))
      })
    }
  },

  addImages: function(options, data, test) {
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
     * @param {object} options - monastery operation options {model, query, files, ..}
     * @param {object} data -
     * @param {boolean} test -
     * @return promise(
     *   {object} data - data object containing new S3 image-object
     * ])
     * @this plugin
     */
    let { model, query, files } = options
    if (!files) return Promise.resolve([])

    // Build an ID query from query/data. Inserts add _id to the data automatically.
    let idquery = query && query._id? query : { _id: data._id }

    // We currently don't support an array of data objects.
    if (util.isArray(data)) {
      return Promise.reject('Adding images to mulitple data objects is not supported.')

    // We require the update query OR data object to contain _id. This is because non-id queries
    // will not suffice when updating the document(s) against the same query again.
    } else if (!data._id && (!query || !query._id)) {
      return Promise.reject('Adding images requires the update operation to query via _id\'s.')
    }

    // Find valid images and upload to S3, and update data with image objects
    return plugin._findValidImages(files, model).then(files => {
      return Promise.all(files.map(filesArr => {
        return Promise.all(filesArr.map(file => {
          return new Promise((resolve, reject) => {
            let uid = nanoid.nanoid()
            let pathFilename = filesArr.imageField.filename ? '/' + filesArr.imageField.filename : ''
            let image = {
              bucket: this.awsBucket,
              date: this.manager.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000),
              filename: file.name,
              filesize: file.size,
              path: `${plugin.bucketDir}/${uid}${pathFilename}.${file.ext}`,
              // sizes: ['large', 'medium', 'small'],
              uid: uid,
            }
            this.manager.info(
              `Uploading '${image.filename}' to '${image.bucket}/${image.path}'`
            )
            if (test) {
              plugin._addImageObjectsToData(filesArr.inputPath, data, image)
              resolve()
            } else {
              plugin.s3.upload({
                Bucket: this.awsBucket,
                Key: image.path,
                Body: file.data,
                // The IAM permission "s3:PutObjectACL" must be included in the appropriate policy
                ACL: 'public-read',
                // upload params,https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
                ...filesArr.imageField.params,

              }, (err, response) => {
                if (err) return reject(err)
                plugin._addImageObjectsToData(filesArr.inputPath, data, image)
                resolve()
              })
            }
          })
        }))
      }))

    // Save the data against the matching document(s)
    }).then(() => {
      // Remove update's _output object
      let prunedData = { ...data }
      delete prunedData._output
      if (test) return [prunedData]
      return model._update(
        idquery,
        { '$set': prunedData },
        { 'multi': options.multi || options.create },
      )

    // If errors, remove inserted documents to prevent double ups when the user resaves.
    // We are pretty much trying to emulate a db transaction.
    }).catch(err => {
      if (options.create) model._remove(idquery)
      throw err
    })
  },

  keepImagePlacement: async function(options, data) {
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
     * @param {object} options - monastery operation options {query, model, files, multi, ..}
     * @return promise
     * @this plugin
     */
    if (typeof options.files == 'undefined') return
    // Check upload errors and find valid uploaded images
    let files = await plugin._findValidImages(options.files || {}, options.model)
    // Set undefined primative-array items to null where files are located
    for (let filesArray of files) {
      if (filesArray.inputPath.match(/\.[0-9]+$/)) {
        util.setDeepValue(data, filesArray.inputPath, null, true, false, true)
      }
    }
  },

  removeImages: async function(options, data, test) {
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
     * @param {object} options - monastery operation options {query, model, files, multi, ..}
     * @return promise([
     *   {object} useCount - images that wont be removed, e.g. { lion1: 1 }
     *   {array} unused - S3 image uris to be removed,  e.g. [{ Key: 'small/lion1.jpg' }, ..]
     * ])
     * @this plugin
     */
    let pre
    let preExistingImages = []
    let useCount = {}
    if (typeof options.files == 'undefined') return

    // Find all documents from the same query
    let docs = await options.model._find(options.query, options)

    // Find all pre-existing image objects in documents
    for (let doc of util.toArray(docs)) { //x2
      for (let imageField of options.model.imageFields) { //x5
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
    let files = await plugin._findValidImages(options.files || {}, options.model)

    // Loop all schema image fields
    for (let imageField of options.model.imageFields) { //x5
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
              images saved on this document.`
          // Different image from prexisting image
          } else if (preExistingImage && preExistingImage.image.uid != image.image.uid) {
            useCount[preExistingImage.image.uid]--
            useCount[image.image.uid]++
          // No pre-existing image found
          } else if (!preExistingImage) {
            useCount[image.image.uid]++
          }
          // Any file overriding this image?
          for (let filesArray of files) {
            if (image.dataPath == filesArray.inputPath) {
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
        // original key can have a different extension
        { Key: pre.image.path },
        { Key: `small/${key}.jpg` },
        { Key: `medium/${key}.jpg` },
        { Key: `large/${key}.jpg` }
      )
      this.manager.info(
        `Removing '${pre.image.filename}' from '${pre.image.bucket}/${pre.image.path}'`
      )
    }
    if (test) return [useCount, unused]
    // Delete any unused images from s3. If the image is on a different bucket
    // the file doesnt get deleted, we only delete from plugin.awsBucket.
    if (!unused.length) return
    await new Promise((resolve, reject) => {
      plugin.s3.deleteObjects({ Bucket: plugin.awsBucket, Delete: { Objects: unused }}, (err, data) => {
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

  _findValidImages: function(files, model) {
    /**
     * Find and return valid uploaded files
     * @param {object} files - req.files
     * @param {object} model
     * @return promise([
     *   [{..file}, .imageField, .inputPath],
     *   ..
     * ])
     */
    let validFiles = []

    // Filter valid image files by `type='image'`, convert file keys to dot notation, and force array
    for (let key in files) {
      let key2 = key.replace(/\]/g, '').replace(/\[/g, '.')
      let imageField = model.imageFields.find(o => key2.match(o.fullPathRegex))
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
          fileType.fromBuffer(file.data).then(res => {
            let maxSize = filesArr.imageField.filesize
            let formats = filesArr.imageField.formats || plugin.formats
            let allowAny = util.inArray(formats, 'any')
            file.format = res? res.ext : ''
            file.ext = file.format || (file.name.match(/\.(.*)$/) || [])[1] || 'unknown'
            file.nameClipped = file.name.length > 14? file.name.substring(0, 14) + '..' : file.name

            if (file.truncated) reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file size for '${file.nameClipped}' is too big.`
            })
            else if (maxSize && maxSize < file.size) reject({ // file.size == bytes
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file size for '${file.nameClipped}' is bigger than ${(maxSize/1000/1000).toFixed(1)}MB.`
            })
            else if (file.ext == 'unknown') reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `Please add a file extension to your file '${file.nameClipped}'`
            })
            else if (!allowAny && !util.inArray(formats, file.ext)) reject({
              title: filesArr.inputPath + (i? `.${i}` : ''),
              detail: `The file format '${file.ext}' for '${file.nameClipped}' is not supported`
            })
            else resolve()
          })
        })
      }))
    })).then(() => validFiles)
  },

  _findAndTransformImageFields: function(fields, path) {
    /**
     * Returns a list of valid image fields
     * @param {object|array} fields
     * @param {string} path
     * @return [{}, ...]
     */
    let list = []
    util.forEach(fields, (field, fieldName) => {
      let path2 = `${path}.${fieldName}`.replace(/^\./, '')
      // let schema = field.schema || {}

      // Subdocument field
      if (util.isSubdocument(field)) {//schema.isObject
        // log(`Recurse 1: ${path2}`)
        list = list.concat(this._findAndTransformImageFields(field, path2))

      // Array field
      } else if (util.isArray(field)) {//schema.isArray
        // log(`Recurse 2: ${path2}`)
        list = list.concat(this._findAndTransformImageFields(field, path2))

      // Image field. Test for field.image as field.type may be 'any'
      } else if (field.type == 'image' || field.image) {
        let formats = field.formats
        let filesize = field.filesize || field.fileSize // old <= v1.31.7
        let filename = field.filename
        let params = { ...field.params||{} }
        // Convert image field to subdocument
        fields[fieldName] = {
          bucket: { type: 'string' },
          date: { type: 'number' },
          filename: { type: 'string' },
          filesize: { type: 'number' },
          path: { type: 'string' },
          schema: { image: true, nullObject: true, isImageObject: true },
          uid: { type: 'string' },
        }
        list.push({
          fullPath: path2,
          fullPathRegex: new RegExp('^' + path2.replace(/\.[0-9]+/g, '.[0-9]+').replace(/\./g, '\\.') + '$'),
          formats: formats,
          filesize: filesize,
          filename: filename,
          params: params,
        })
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
            list.push(...this._findImagesInData(
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
  }

}
