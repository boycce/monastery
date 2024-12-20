// Data no images doesn't throw error
const util = require('../lib/util.js')
const imagePluginFile = require('../plugins/images/index.js')
const monastery = require('../lib/index.js')
const imagePluginFakeOpts = { awsBucket: 'fake', awsRegion: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }

let db
afterAll(async () => { db.close() })
beforeAll(async () => { 
  db = monastery.manager('127.0.0.1/monastery', {
    timestamps: false, 
    imagePlugin: imagePluginFakeOpts,
  }) 
})

test('images no initialisation', async () => {
  const db2 = monastery.manager('127.0.0.1/monastery', { timestamps: false })
  db2.model('company', {
    fields: {
      logo: { type: 'image' },
    },
  })
  db2.model('user', {
    fields: {
      company: { model: 'company' },
    },
  })
  let company = await db2.company.insert({ data: {
    logo: { bucket: 'corex-dev', date: 1598481616 },
  }})
  let user = await db2.user.insert({ data: {
    company: company._id,
  }})
  let foundCompany = await db2.company.find({
    query: company._id,
  })
  let foundUser = await db2.user.find({
    query: user._id, populate: ['company'],
  })

  // schema
  expect(db2.company.fields.logo).toEqual({
    schema: {
      image: true,
      isAny: true,
      isSchema: true,
      isType: 'isAny',
      type: 'any',
    },
  })

  // found company
  expect(foundCompany).toEqual({
    _id: company._id,
    logo: { bucket: 'corex-dev', date: 1598481616 },
  })

  // found user
  expect(foundUser).toEqual({
    _id: user._id,
    company: {
      _id: company._id,
      logo: { bucket: 'corex-dev', date: 1598481616 },
    },
  })
  db2.close()
})

test('images initialisation', async () => {
  let user = db.model('user', { 
    fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ logo: { type: 'image' } }],
    },
  })

  // Initialisation success
  expect(db.opts.imagePlugin).toEqual(imagePluginFakeOpts)

  function schemaForType(type) {
    return {
      schema: {
        type: type, 
        isType: `is${util.ucFirst(type)}`, 
        [`is${util.ucFirst(type)}`]: true, 
        isSchema: true,
      },
    }
  }
  let expected = {
    bucket: schemaForType('string'),
    date: schemaForType('number'),
    filename: schemaForType('string'),
    filesize: schemaForType('number'),
    metadata: schemaForType('any'),
    path: schemaForType('string'),
    uid: schemaForType('string'),
    schema: {
      type: 'object', 
      isObject: true,
      isSchema: true,
      isType: 'isObject',
      nullObject: true,
      // Image rules
      image: true, 
      isImageObject: true,
    },
  }

  // Logo schema
  expect(user.fields.logo).toEqual(expected)
  expect(user.fields.logos[0]).toEqual(expected)
  expect(user.fields.users[0].logo).toEqual(expected)
})

test('images addImages helper functions', async () => {
  db.model('user', { fields: {
    logo: { type: 'image' },
    logos: [{ type: 'image' }],
    users: [{ logo: { type: 'image' } }],
  }})

  // Adding
  let image = { file: 'test' }

  // lvl 1 property
  expect(imagePluginFile._addImageObjectsToData('logo', {}, image))
    .toEqual({ logo: image })

  // lvl 1 existing property
  expect(imagePluginFile._addImageObjectsToData('logo', { logo: null }, image))
    .toEqual({ logo: image })

  // lvl 1 array property
  expect(imagePluginFile._addImageObjectsToData('logo.0', {}, image))
    .toEqual({ logo: [image] })

  // lvl 1 array existing property
  expect(imagePluginFile._addImageObjectsToData('logo.1', { logo: [image] }, image))
    .toEqual({ logo: [image, image] })

  // lvl 2 property
  expect(imagePluginFile._addImageObjectsToData('user.logo', {}, image))
    .toEqual({ user: { logo: image }})

  // lvl 2 existing property
  expect(imagePluginFile._addImageObjectsToData('user.logo', { user: { logo: null }}, image))
    .toEqual({ user: { logo: image }})

  // lvl 2 array property
  expect(imagePluginFile._addImageObjectsToData('user.1.logo', {}, image))
    .toEqual({ user: [undefined, { logo: image }]})

  // lvl 5 property
  expect(imagePluginFile._addImageObjectsToData('user.a.b.c.logo', {}, image))
    .toEqual({ user: { a: { b: { c: { logo: image }}}}})
})

test('images addImages', async () => {
  let user = db.model('user', { 
    fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ logo: { type: 'image' } }],
    },
  })
  // console.log(db.opts, user.fields.logo)
  // throw 'qwef'

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

  app.post('/', async function(req, res) {
    try {
      // Files exist
      expect(req.files.logo).toEqual(expect.any(Object))
      let validFiles = await imagePluginFile._findValidImages.call(user, req.files)
      // Valid file count
      expect(validFiles).toEqual([
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
      ])
      // Valid imageField
      expect(validFiles[0].imageField).toEqual(expect.any(Object))
      expect(validFiles[1].imageField).toEqual(expect.any(Object))
      expect(validFiles[2].imageField).toEqual(expect.any(Object))
      expect(validFiles[3].imageField).toEqual(expect.any(Object))
      // Valid inputPath
      expect(validFiles[0].inputPath).toEqual('logo')
      expect(validFiles[1].inputPath).toEqual('logos.0')
      expect(validFiles[2].inputPath).toEqual('users.0.logo')
      expect(validFiles[3].inputPath).toEqual('users.2.logo')
      // Valid type
      expect(validFiles[0][0].format).toEqual('png')
      expect(validFiles[1][0].format).toEqual('png')
      expect(validFiles[2][0].format).toEqual('png')
      expect(validFiles[3][0].format).toEqual('png')

      let response = await imagePluginFile.addImages.call(
        { model: user, files: req.files, query: { _id: 1234 }},
        req.body,
        true
      )
      expect(response[0]).toEqual({
        name: 'my awesome avatar',
        logo: {
          bucket: 'fake',
          date: expect.any(Number),
          filename: 'logo.png',
          filesize: expect.any(Number),
          path: expect.any(String),
          uid: expect.any(String),
        },
        logos: [ expect.any(Object) ],
        users: [
          {
            logo: {
              bucket: 'fake',
              date: expect.any(Number),
              filename: 'logo2.png',
              filesize: expect.any(Number),
              path: expect.any(String),
              uid: expect.any(String),
            },
          },
          undefined, // !this will be converted to null on insert/update
          {
            logo: {
              bucket: 'fake',
              date: expect.any(Number),
              filename: 'logo2.png',
              filesize: expect.any(Number),
              path: expect.any(String),
              uid: expect.any(String),
            },
          },
        ],
      })
      res.send()
    } catch (e) {
      console.log(e)
      // console.log(e.message || e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .field('name', 'my awesome avatar')
    .attach('logo', `${__dirname}/assets/logo.png`)
    .attach('logos.0', `${__dirname}/assets/logo2.png`)
    .attach('users.0.logo', `${__dirname}/assets/logo2.png`)
    .attach('users.2.logo', `${__dirname}/assets/logo2.png`)
    .expect(200)
})

test('images removeImages', async () => {
  let user = db.model('user', { fields: {
    logo: { type: 'image' },
    logos: [{ type: 'image' }],
    users: [{ userlogo: { type: 'image' } }],
    deep: { logo: { type: 'image' }},
  }})

  let image = {
    bucket: 'test',
    date: 1234,
    filename: 'test.png',
    filesize: 1234,
    path: 'test/test123',
  }
  let user1 = await db.user._insert({
    logo: { ...image, uid: 'test1', path: 'dir/test1.png' },
    logos: [
      { ...image, uid: 'test2', path: 'dir/test2.png' },
      { ...image, uid: 'test3', path: 'dir/test3.png' },
    ],
    users: [
      { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }},
      null,
      { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }},
      { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }},
    ],
    deep: {},
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

  app.post('/', async function(req, res) {
    try {
      req.body.logos = JSON.parse(req.body.logos)
      req.body.users = JSON.parse(req.body.users)
      let options = { files: req.files, model: user, query: { _id: user1._id }}
      let response = await imagePluginFile.removeImages.call(options, req.body, true)
      expect(response[0]).toEqual({ test1: 1, test2: 0, test3: 1, test4: 0 })
      expect(response[1]).toEqual([
        { Key: 'dir/test2.png' },
        { Key: 'small/test2.jpg' },
        { Key: 'medium/test2.jpg' },
        { Key: 'large/test2.jpg' },

        { Key: 'dir/test4.png' },
        { Key: 'small/test4.jpg' },
        { Key: 'medium/test4.jpg' },
        { Key: 'large/test4.jpg' },
      ])
      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  await supertest(app)
    .post('/')
    .field('name', 'my awesome avatar')
    .field('logos', JSON.stringify([ null, { ...image, uid: 'test3', path: 'dir/test3.png' } ]))
    .field('users', JSON.stringify([
      { userlogo: { ...image, uid: 'test1', path: 'dir/test1.png' }},
      null,
      null,
      //null // undefined
    ]))
    .attach('logo', `${__dirname}/assets/logo.png`)
    .attach('logos.0', `${__dirname}/assets/logo2.png`)
    .expect(200)
})

test('images removeImages with no data', async () => {
  // NOTE: Redundent, leaving for now (test was needed to fix a project issue)
  let user = db.model('user', { fields: {
    logo: { type: 'image' },
  }})

  // let image = {
  //   bucket: 'test',
  //   date: 1234,
  //   filename: 'test.png',
  //   filesize: 1234,
  //   path: 'test/test123'
  // }
  let user1 = await db.user._insert({
    logo: null,
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

  app.post('/', async function(req, res) {
    try {
      let options = { files: req.files, model: user, query: { _id: user1._id }}
      let response = await imagePluginFile.removeImages.call(options, req.body, true)
      expect(response[0]).toEqual({})
      expect(response[1]).toEqual([])
      res.send()
    } catch(e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .attach('logo', `${__dirname}/assets/logo.png`)
    .expect(200)
})

test('images addImages bad file objects', async () => {
  db.model('user', { fields: {
    logo: { type: 'image' },
    logos: [{ type: 'image' }],
    users: [{ logo: { type: 'image' } }],
  }})

  let imageObjectMock = {
    bucket: 'temp',
    date: 1234,
    filename: 'temp.png',
    filesize: 1234,
    path: 'temp',
    uid: 'temp',
  }
  let detailLongMock = 'Image fields need to either be null, undefined, file, or an object containing the '
    + 'following fields \'{ bucket, date, filename, filesize, path, uid }\''

  let supertest = require('supertest')
  let express = require('express')
  let bodyParser = require('body-parser')
  let app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.post('/', async function(req, res) {
    try {
      await db.user.validate(req.body)
      res.send()
    } catch (e) {
      res.status(500).send(e)
    }
  })

  await supertest(app)
    .post('/')
    .send({
      logo: null,//ok
      logos: [undefined, imageObjectMock, {}],//0,1=ok,3=bad
      users: [
        { logo: {} },//bad
        { logo: { bucket: '' }},//bad
        { logo: imageObjectMock },//ok
        { logo: null },//ok
      ],
    })
    .expect(500)
    .then(res => {
      // console.log(res.body)
      expect(res.body).toEqual([
        {
          detail: 'Invalid image value',
          meta: { rule: 'isImageObject', model: 'user', field: '2', detailLong: detailLongMock },
          status: '400',
          title: 'logos.2',
        }, {
          detail: 'Invalid image value',
          meta: { rule: 'isImageObject', model: 'user', field: 'logo', detailLong: detailLongMock },
          status: '400',
          title: 'users.0.logo',
        }, {
          detail: 'Invalid image value',
          meta: { rule: 'isImageObject', model: 'user', field: 'logo', detailLong: detailLongMock },
          status: '400',
          title: 'users.1.logo',
        },
      ])
    })
})

test('images reorder', async () => {
  let user = db.model('user', { fields: {
    logos: [{ type: 'image' }],
  }})

  let image = {
    bucket: 'test',
    date: 1234,
    filename: 'lion1.png',
    filesize: 1234,
    path: 'test/lion1.png',
    uid: 'lion1',
  }

  let user1 = await db.user._insert({
    logos: [image],
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload())

  // Reorder
  app.post('/', async function(req, res) {
    try {
      req.body.logos = JSON.parse(req.body.logos)
      let options = { files: req.files, model: user, query: { _id: user1._id } }
      let response = await imagePluginFile.removeImages.call(options, req.body, true)
      expect(response[0]).toEqual({ lion1: 1 })
      expect(response[1]).toEqual([])
      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })
  await supertest(app)
    .post('/')
    .field('logos', JSON.stringify([ null, image ]))
    .expect(200)
})

test('images reorder and added image', async () => {
  // latest (2022.02)
  let user = db.model('user', { fields: {
    photos: [{ type: 'image' }],
  }})

  let image = {
    bucket: 'test',
    date: 1234,
    filename: 'lion1.png',
    filesize: 1234,
    path: 'test/lion1.png',
    uid: 'lion1',
  }

  let user1 = await db.user._insert({
    photos: [image],
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload())

  app.post('/', async function(req, res) {
    try {
      // Parse and validate data which is used before in update/insert
      let options = { files: req.files, model: user, query: { _id: user1._id } }
      let data = await util.parseData(req.body)
      data = await user.validate(data, { ...options, update: true })

      // Empty photo placeholder not removed in validate?
      expect(data.photos[0]).toEqual(null)
      expect(data.photos[1]).toEqual(image)

      // Remove images
      let response = await imagePluginFile.removeImages.call(options, data, true)
      expect(response[0]).toEqual({ lion1: 1 }) // useCount
      expect(response[1]).toEqual([]) // unused

      // New file exists
      let validFiles = await imagePluginFile._findValidImages.call(user, req.files)
      expect(((validFiles||[])[0]||{}).inputPath).toEqual('photos.0') // Valid inputPath

      // Add images
      response = await imagePluginFile.addImages.call(options, data, true)
      expect(response[0]).toEqual({
        photos: [{
          bucket: 'fake',
          date: expect.any(Number),
          filename: 'lion2.jpg',
          filesize: expect.any(Number),
          path: expect.any(String),
          uid: expect.any(String),
        }, {
          bucket: 'test', // still the same image-object reference (nothing new)
          date: expect.any(Number),
          filename: 'lion1.png',
          filesize: expect.any(Number),
          path: expect.any(String),
          uid: expect.any(String),
        }],
      })

      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  await supertest(app)
    .post('/')
    // Mock multipart/form-data syntax which is not supported by supertest (formdata sent with axios)
    //  E.g.
    //    req.body  = 'photos[1][bucket]' : '...'
    //    req.files = 'photos[0]' : { ...binary }
    .field('photos[1][bucket]', image.bucket)
    .field('photos[1][date]', image.date)
    .field('photos[1][filename]', image.filename)
    .field('photos[1][filesize]', image.filesize)
    .field('photos[1][path]', image.path)
    .field('photos[1][uid]', image.uid)
    .attach('photos[0]', `${__dirname}/assets/lion2.jpg`)
    .expect(200)
})

test('images option defaults', async () => {
  // testing (awsAcl filesize formats getSignedUrl path params)
  let user = db.model('user', {
    fields: {
      logo: { type: 'image' },
    },
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1000 * 480, files: 10 }}))

  // Basic tests
  expect(db.imagePlugin.awsAcl).toEqual('public-read')
  expect(db.imagePlugin.filesize).toEqual(undefined)
  expect(db.imagePlugin.formats).toEqual(['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tiff'])
  expect(db.imagePlugin.getSignedUrlOption).toEqual(undefined)
  expect(db.imagePlugin.metadata).toEqual(undefined)
  expect(db.imagePlugin.path).toEqual(expect.any(Function))
  expect(db.imagePlugin.params).toEqual({})

  // Images not signed
  let image
  let userInserted = await db.user._insert({
    logo: (image = {
      bucket: 'fake',
      date: 1234,
      filename: 'lion1.png',
      filesize: 1234,
      path: 'test/lion1.png',
      uid: '1234',
    }),
  })
  await expect(db.user.findOne({ query: userInserted._id })).resolves.toEqual({
    _id: expect.any(Object),
    logo: image,
  })

  app.post('/', async (req, res) => {
    try {
      // Files exist
      expect(req.files.logo).toEqual(expect.any(Object))
      let response = await imagePluginFile.addImages.call(
        { model: user, files: req.files, query: { _id: 1234 }},
        req.body || {},
        true
      )
      // Updated data object
      expect(response[0]).toEqual({
        logo: {
          bucket: 'fake',
          date: expect.any(Number),
          filename: 'logo.png',
          filesize: expect.any(Number),
          path: expect.stringMatching(/^full\/.*png$/),
          uid: expect.any(String),
        },
      })
      // S3 options
      expect(response[1]).toEqual([
        [{
          ACL: 'public-read',
          Body: expect.any(Object),
          Bucket: 'fake',
          Key: expect.stringMatching(/^full\/.*png$/),
        }],
      ])
      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .attach('logo', `${__dirname}/assets/logo.png`)
    .expect(200)
})

test('images options formats & filesizes', async () => {
  const db3 = monastery.manager('127.0.0.1/monastery', {
    timestamps: false, 
    imagePlugin: { 
      ...imagePluginFakeOpts,
      formats: ['jpg', 'jpeg', 'png', 'ico'],
      filesize: 1000 * 270, 
    },
  })

  let user = db3.model('user', { fields: {
    imageIco:     { type: 'image' },
    imageWebp:    { type: 'image', formats: ['webp'] },
    imageSvgBad:  { type: 'image' },
    imageSvgGood: { type: 'image', formats: ['svg'] },
    imageSvgAny:  { type: 'image', formats: ['any'] },
    imageSize1:   { type: 'image', filesize: 1000 * 100 },
    imageSize2:   { type: 'image' },
    imageSize3:   { type: 'image' },
  }})

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1000 * 480, files: 10 }}))

  app.post('/', async (req, res) => {
    try {
      let imageSvgBad = { imageSvgBad: req.files.imageSvgBad }
      let imageSize1 = { imageSize1: req.files.imageSize1 }
      let imageSize2 = { imageSize2: req.files.imageSize2 }
      let imageSize3 = { imageSize3: req.files.imageSize3 }
      delete req.files.imageSvgBad
      delete req.files.imageSize1
      delete req.files.imageSize2
      delete req.files.imageSize3
      // Ico, Webp, and imageSvgGood will throw an error first if it's not a valid type
      await expect(imagePluginFile._findValidImages.call(user, req.files)).resolves.toEqual(expect.any(Array))
      await expect(imagePluginFile._findValidImages.call(user, imageSvgBad)).rejects.toEqual({
        title: 'imageSvgBad',
        detail: 'The file format \'svg\' for \'bad.svg\' is not supported',
      })
      await expect(imagePluginFile._findValidImages.call(user, imageSize1)).rejects.toEqual({
        title: 'imageSize1',
        detail: 'The file size for \'lion1.png\' is bigger than 0.1MB.',
      })
      await expect(imagePluginFile._findValidImages.call(user, imageSize2)).rejects.toEqual({
        title: 'imageSize2',
        detail: 'The file size for \'lion2.jpg\' is bigger than 0.3MB.',
      })
      await expect(imagePluginFile._findValidImages.call(user, imageSize3)).rejects.toEqual({
        title: 'imageSize3',
        detail: 'The file size for \'house.jpg\' is too big.',
      })
      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .attach('imageIco', `${__dirname}/assets/image.ico`)
    .attach('imageWebp', `${__dirname}/assets/image.webp`)
    .attach('imageSvgBad', `${__dirname}/assets/bad.svg`)
    .attach('imageSvgGood', `${__dirname}/assets/bad.svg`)
    .attach('imageSvgAny', `${__dirname}/assets/bad.svg`)
    .attach('imageSize1', `${__dirname}/assets/lion1.png`)
    .attach('imageSize2', `${__dirname}/assets/lion2.jpg`)
    .attach('imageSize3', `${__dirname}/assets/house.jpg`)
    .expect(200)
  
  db3.close()
})

test('images option getSignedUrls', async () => {
  // latest (2022.02)
  const db3 = monastery.manager('127.0.0.1/monastery', {
    timestamps: false, 
    imagePlugin: { 
      ...imagePluginFakeOpts,
      awsRegion: 'ap-southeast-2',
      getSignedUrl: true,
    },
  })

  db3.model('user', { fields: {
    photos: [{ type: 'image', getSignedUrl: false }],
    photos2: [{ type: 'image' }],
  }})

  let image = {
    bucket: 'test',
    date: 1234,
    filename: 'lion1.png',
    filesize: 1234,
    path: 'test/lion1.png',
    uid: 'lion1',
  }
  let imageWithSignedUrl = {
    ...image,
    signedUrl: expect.stringMatching(/^https/),
  }

  let userInserted = await db3.user._insert({
    photos: [image, image],
    photos2: [image, image],
  })

  // Find signed URL via query option
  await expect(db3.user.findOne({ query: userInserted._id, getSignedUrls: true })).resolves.toEqual({
    _id: expect.any(Object),
    photos: [imageWithSignedUrl, imageWithSignedUrl],
    photos2: [imageWithSignedUrl, imageWithSignedUrl],
  })

  // Find signed URL via schema option
  await expect(db3.user.findOne({ query: userInserted._id })).resolves.toEqual({
    _id: expect.any(Object),
    photos: [image, image],
    photos2: [imageWithSignedUrl, imageWithSignedUrl],
  })

  // Works with _processAfterFind
  let rawUser = await db3.user._findOne({ _id: userInserted._id })
  await expect(db3.user._processAfterFind(rawUser)).resolves.toEqual({
    _id: expect.any(Object),
    photos: [image, image],
    photos2: [imageWithSignedUrl, imageWithSignedUrl],
  })
  db3.close()
})

test('images options awsAcl, awsBucket, metadata, params, path', async () => {
  const db3 = monastery.manager('127.0.0.1/monastery', {
    timestamps: false, 
    imagePlugin: { 
      ...imagePluginFakeOpts,
      awsAcl: 'private',
      metadata: { small: '*x300' , medium: '*x800', large: '*x1200' },
      params: { ContentLanguage: 'DE'},
      path: (uid, basename, ext, file) => `images/${basename}`,
    },
  })

  let user = db3.model('user', {
    fields: {
      optionDefaults: { type: 'image' },
      optionOverrides: {
        type: 'image',
        awsAcl: 'public-read-write',
        awsBucket: 'fake2',
        metadata: { small: '*x100' , medium: '*x400', large: '*x800' },
        params: { ContentLanguage: 'NZ'},
        path: (uid, basename, ext, file) => `images2/${basename}`,
      },
    },
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload())

  app.post('/', async function(req, res) {
    try {
      // Files exist
      expect(req.files.optionDefaults).toEqual(expect.any(Object))
      expect(req.files.optionOverrides).toEqual(expect.any(Object))
      let response = await imagePluginFile.addImages.call(
        { model: user, files: req.files, query: { _id: 1234 }},
        req.body || {},
        true
      )
      // Updated data object
      expect(response[0]).toEqual({
        optionDefaults: {
          bucket: 'fake',
          date: expect.any(Number),
          filename: 'logo.png',
          filesize: expect.any(Number),
          metadata: { small: '*x300' , medium: '*x800', large: '*x1200' },
          path: 'images/logo.png',
          uid: expect.any(String),
        },
        optionOverrides: {
          bucket: 'fake2',
          date: expect.any(Number),
          filename: 'logo2.png',
          filesize: expect.any(Number),
          metadata: { small: '*x100' , medium: '*x400', large: '*x800' },
          path: 'images2/logo2.png',
          uid: expect.any(String),
        },
      })
      // S3 options
      expect(response[1]).toEqual([
        [{
          ACL: 'private',
          Body: expect.any(Object),
          Bucket: 'fake',
          ContentLanguage: 'DE',
          Key: 'images/logo.png',
          Metadata:  { small: '*x300' , medium: '*x800', large: '*x1200' },
        }],
        [{
          ACL: 'public-read-write',
          Body: expect.any(Object),
          Bucket: 'fake2',
          ContentLanguage: 'NZ',
          Key: 'images2/logo2.png',
          Metadata: { small: '*x100' , medium: '*x400', large: '*x800' },
        }],
      ])
      res.send()
    } catch (e) {
      console.log(e.message||e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .attach('optionDefaults', `${__dirname}/assets/logo.png`)
    .attach('optionOverrides', `${__dirname}/assets/logo2.png`)
    .expect(200)

  db3.close()
})

test('images option depreciations', async () => {
  // testing (filename bucketDir)
  const db3 = monastery.manager('127.0.0.1/monastery', {
    logLevel: 1,
    timestamps: false, 
    imagePlugin: { 
      ...imagePluginFakeOpts,
      bucketDir: 'old',
    },
  })

  let user = db3.model('user', {
    fields: {
      logo: { type: 'image', filename: 'oldLogo' },
    },
  })

  let supertest = require('supertest')
  let express = require('express')
  let upload = require('express-fileupload')
  let app = express()
  app.use(upload({ limits: { fileSize: 1000 * 480, files: 10 }}))

  app.post('/', async (req, res) => {
    try {
      // Files exist
      expect(req.files.logo).toEqual(expect.any(Object))
      let response = await imagePluginFile.addImages.call(
        { model: user, files: req.files, query: { _id: 1234 }},
        req.body || {},
        true
      )
      // Updated data object
      expect(response[0]).toEqual({
        logo: {
          bucket: 'fake',
          date: expect.any(Number),
          filename: 'logo.png',
          filesize: expect.any(Number),
          path: expect.stringMatching(/^old\/.*\/oldLogo\.png$/),
          uid: expect.any(String),
        },
      })
      res.send()
    } catch (e) {
      console.log(e.message || e)
      res.status(500).send()
    }
  })

  // Start tests
  await supertest(app)
    .post('/')
    .attach('logo', `${__dirname}/assets/logo.png`)
    .expect(200)

  db3.close()
})
