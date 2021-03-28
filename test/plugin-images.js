module.exports = function(monastery, db) {

  // Data no images doesn't throw error

  test('images: no initialisation', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
    db.model('company', {
      fields: {
        logo: { type: 'image' }
      }
    })
    db.model('user', {
      fields: {
        company: { model: 'company' }
      }
    })
    let company = await db.company.insert({ data: {
      logo: { bucket: "corex-dev", date: 1598481616 }
    }})
    let user = await db.user.insert({ data: {
      company: company._id
    }})
    let foundCompany = await db.company.find({
      query: company._id
    })
    let foundUser = await db.user.find({
      query: user._id, populate: ['company']
    })

    // schema
    expect(db.company.fields.logo).toEqual({
      image: true,
      isAny: true,
      type: "any"
    })

    // found company
    expect(foundCompany).toEqual({
      _id: company._id,
      logo: { bucket: "corex-dev", date: 1598481616 },
    })

    // found user
    expect(foundUser).toEqual({
      _id: user._id,
      company: {
        _id: company._id,
        logo: { bucket: "corex-dev", date: 1598481616 }
      }
    })

    db.close()
    done()
  })

  test('images: initialisation', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: { awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }
    })
    let user = db.model('user', { fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ logo: { type: 'image' } }]
    }})

    // Initialisation success
    expect(db.imagePlugin).toEqual({ awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' })

    let expected = {
      bucket: { type: 'string', isString: true },
      date: { type: 'number', isNumber: true },
      filename: { type: 'string', isString: true },
      filesize: { type: 'number', isNumber: true },
      path: { type: 'string', isString: true },
      schema: { type: 'object', isObject: true, image: true, nullObject: true },
      uid: { type: 'string', isString: true }
    }

    // Logo schema
    expect(user.fields.logo).toEqual(expected)
    expect(user.fields.logos[0]).toEqual(expected)
    expect(user.fields.users[0].logo).toEqual(expected)

    await user.find({ query: {} }) // wait for db to open before closing
    db.close()
    done()
  })

  test('images: addImages helper functions', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: { awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }
    })
    let plugin = db.imagePluginFile
    let user = db.model('user', { fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ logo: { type: 'image' } }]
    }})

    // Adding
    let image = { file: 'test' }

    // lvl 1 property
    expect(plugin._addImageObjectsToData('logo', {}, image))
      .toEqual({ logo: image })

    // lvl 1 existing property
    expect(plugin._addImageObjectsToData('logo', { logo: null }, image))
      .toEqual({ logo: image })

    // lvl 1 array property
    expect(plugin._addImageObjectsToData('logo.0', {}, image))
      .toEqual({ logo: [image] })

    // lvl 1 array existing property
    expect(plugin._addImageObjectsToData('logo.1', { logo: [image] }, image))
      .toEqual({ logo: [image, image] })

    // lvl 2 property
    expect(plugin._addImageObjectsToData('user.logo', {}, image))
      .toEqual({ user: { logo: image }})

    // lvl 2 existing property
    expect(plugin._addImageObjectsToData('user.logo', { user: { logo: null }}, image))
      .toEqual({ user: { logo: image }})

    // lvl 2 array property
    expect(plugin._addImageObjectsToData('user.1.logo', {}, image))
      .toEqual({ user: [undefined, { logo: image }]})

    // lvl 5 property
    expect(plugin._addImageObjectsToData('user.a.b.c.logo', {}, image))
      .toEqual({ user: { a: { b: { c: { logo: image }}}}})


    db.close()
    done()
  })

  test('images: addImages', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: { awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }
    })
    let user = db.model('user', { fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ logo: { type: 'image' } }]
    }})

    let plugin = db.imagePluginFile
    let supertest = require('supertest')
    let express = require('express')
    let upload = require('express-fileupload')
    let app = express()
    app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

    app.post('/', function(req, res) {
      // Files exist
      expect(req.files.logo).toEqual(expect.any(Object))
      plugin._findValidImages(req.files, user)
        .then(validFiles => {
          // Valid file count
          expect(validFiles).toEqual([
            expect.any(Array),
            expect.any(Array),
            expect.any(Array),
            expect.any(Array)
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

          return plugin.addImages({ model: user, files: req.files, query: { _id: 1234 }}, req.body, true)
        })
        .then(res => {
          expect(res[0]).toEqual({
            name: 'my awesome avatar',
            logo: {
              bucket: 'fake',
              date: expect.any(Number),
              filename: 'logo.png',
              filesize: expect.any(Number),
              path: expect.any(String),
              uid: expect.any(String)
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
                  uid: expect.any(String)
                }
              },
              undefined, // !this will be converted to null on insert/update
              {
                logo: {
                  bucket: 'fake',
                  date: expect.any(Number),
                  filename: 'logo2.png',
                  filesize: expect.any(Number),
                  path: expect.any(String),
                  uid: expect.any(String)
                }
              }
            ]
          })
        })
        .finally(() => {
          res.json()
          db.close()
          done()
        })
    })

    // Start tests
    supertest(app)
      .post('/')
      .field('name', 'my awesome avatar')
      .attach('logo', `${__dirname}/assets/logo.png`)
      .attach('logos.0', `${__dirname}/assets/logo2.png`)
      .attach('users.0.logo', `${__dirname}/assets/logo2.png`)
      .attach('users.2.logo', `${__dirname}/assets/logo2.png`)
      .expect(200)
      .end((err, res) => { if (err) console.log(err) })
  })

  test('images: removeImages', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: { awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }
    })
    let user = db.model('user', { fields: {
      logo: { type: 'image' },
      logos: [{ type: 'image' }],
      users: [{ userlogo: { type: 'image' } }],
      deep: { logo: { type: 'image' }}
    }})
    let image = {
      bucket: 'test',
      date: 1234,
      filename: 'test.png',
      filesize: 1234,
      path: 'test/test123'
    }
    let user1 = await db.user._insert({
      logo: { ...image, uid: 'test1', path: 'dir/test1.png' },
      logos: [
        { ...image, uid: 'test2', path: 'dir/test2.png' },
        { ...image, uid: 'test3', path: 'dir/test3.png' }
      ],
      users: [
        { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }},
        null,
        { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }},
        { userlogo: { ...image, uid: 'test4', path: 'dir/test4.png' }}
      ],
      deep: {}
    })

    let plugin = db.imagePluginFile
    let supertest = require('supertest')
    let express = require('express')
    let upload = require('express-fileupload')
    let app = express()
    app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

    app.post('/', function(req, res) {
      req.body.logos = JSON.parse(req.body.logos)
      req.body.users = JSON.parse(req.body.users)
      let options = { files: req.files, model: user, query: { _id: user1._id }}

      plugin.removeImages(options, req.body, true)
        .then(res => {
          expect(res[0]).toEqual({ test1: 0, test2: -1, test3: 1, test4: 0 })
          expect(res[1]).toEqual([
            { Key: 'dir/test1.png' },
            { Key: 'small/test1.jpg' },
            { Key: 'medium/test1.jpg' },
            { Key: 'large/test1.jpg' },

            { Key: 'dir/test2.png' },
            { Key: 'small/test2.jpg' },
            { Key: 'medium/test2.jpg' },
            { Key: 'large/test2.jpg' },

            { Key: 'dir/test4.png' },
            { Key: 'small/test4.jpg' },
            { Key: 'medium/test4.jpg' },
            { Key: 'large/test4.jpg' }
          ])
        })
        .finally(() => {
          res.json()
          db.close()
          done()
        })
    })

    // Start tests
    supertest(app)
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
      .end((err, res) => { if (err) console.log(err) })
  })

  test('images: removeImages with no data', async (done) => {
    // NOTE: Redundent, leaving for now (test was needed to fix a project issue)
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: { awsBucket: 'fake', awsAccessKeyId: 'fake', awsSecretAccessKey: 'fake' }
    })
    let user = db.model('user', { fields: {
      logo: { type: 'image' }
    }})
    let image = {
      bucket: 'test',
      date: 1234,
      filename: 'test.png',
      filesize: 1234,
      path: 'test/test123'
    }
    let user1 = await db.user._insert({
      logo: null
    })

    let plugin = db.imagePluginFile
    let supertest = require('supertest')
    let express = require('express')
    let upload = require('express-fileupload')
    let app = express()
    app.use(upload({ limits: { fileSize: 1 * 1000 * 1000, files: 10 }}))

    app.post('/', function(req, res) {
      try {
        let options = { files: req.files, model: user, query: { _id: user1._id }}
        plugin.removeImages(options, req.body, true)
          .then(res => {
            expect(res[0]).toEqual({})
            expect(res[1]).toEqual([])
          })
          .finally(() => {
            res.json()
            db.close()
            done()
          })
      } catch(e) {
        console.log(e)
        res.error(e)
      }
    })

    // Start tests
    supertest(app)
      .post('/')
      .attach('logo', `${__dirname}/assets/logo.png`)
      .expect(200)
      .end((err, res) => { if (err) console.log(err, res.text) })
  })

  test('images: addImages formats & filesizes', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000,
      imagePlugin: {
        awsBucket: 'fake',
        awsAccessKeyId: 'fake',
        awsSecretAccessKey: 'fake',
        formats: ['jpg', 'jpeg', 'png', 'ico']
      }
    })
    let user = db.model('user', { fields: {
      imageIco:  { type: 'image' },
      imageWebp: { type: 'image', formats: ['webp'] },
      imageSvg:  { type: 'image' },
      imageSize1: { type: 'image', fileSize: 1000 * 100 },
      imageSize2: { type: 'image' },
    }})

    let plugin = db.imagePluginFile
    let supertest = require('supertest')
    let express = require('express')
    let upload = require('express-fileupload')
    let app = express()
    app.use(upload({ limits: { fileSize: 1000 * 200, files: 10 }}))

    app.post('/', async (req, res) => {
      let imageSize1 = { imageSize1: req.files.imageSize1 }
      let imageSize2 = { imageSize2: req.files.imageSize2 }
      delete req.files.imageSize1
      delete req.files.imageSize2
      // ico/Webp will throw an error first if it's not a valid type
      await expect(plugin._findValidImages(req.files, user)).rejects.toEqual({
        title: 'imageSvg',
        detail: 'The file format \'svg\' for \'bad.svg\' is not supported'
      })
      await expect(plugin._findValidImages(imageSize1, user)).rejects.toEqual({
        title: 'imageSize1',
        detail: 'The file size for \'lion1.png\' is bigger than 0.1MB.'
      })
      await expect(plugin._findValidImages(imageSize2, user)).rejects.toEqual({
        title: 'imageSize2',
        detail: 'The file size for \'lion2.jpg\' is too big.'
      })
      res.json()
    })

    // Start tests
    supertest(app)
      .post('/')
      .attach('imageIco', `${__dirname}/assets/image.ico`)
      .attach('imageWebp', `${__dirname}/assets/image.webp`)
      .attach('imageSvg', `${__dirname}/assets/bad.svg`)
      .attach('imageSize1', `${__dirname}/assets/lion1.png`)
      .attach('imageSize2', `${__dirname}/assets/lion2.jpg`)
      .expect(200)
      .end((err, res) => {
        if (err) console.log(err)
        db.close()
        done()
      })
  })

}
