module.exports = function(monastery, opendb) {

  test('model setup', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]],
      logo: { type: 'image' }
    }})

    // no fields defined
    expect(db.model('user2', { fields: {} }).fields).toEqual({
      _id: {
         insertOnly: true,
         isId: true,
         type: 'id',
       },
      createdAt: {
         default: expect.any(Function),
         insertOnly: true,
         isInteger: true,
         timestampField: true,
         type: 'integer',
       },
       updatedAt: {
         default: expect.any(Function),
         isInteger: true,
         timestampField: true,
         type: 'integer',
       },
    })

    // Has model name
    expect(user.name).toEqual('user')

    // Basic field
    expect(user.fields.name).toEqual({ type: 'string', isString: true })

    // Image field
    expect(user.fields.logo).toEqual({ type: 'any', isAny: true, image: true })

    // Array field
    expect(user.fields.pets).toContainEqual({ type: 'string', isString: true })

    // Array schema
    expect(user.fields.pets.schema).toEqual({ type: 'array', isArray: true })

    // Subdocument field and schema
    expect(user.fields.colors).toEqual({
      red: { isString: true, type: 'string' },
      schema: { isObject: true, type: 'object' }
    })

    // Array array field (no array properties)
    expect(JSON.stringify(user.fields.points)).toEqual(JSON.stringify(
      [[{ type: 'number', isNumber: true }]]
    ))

    // Array array schema
    expect(user.fields.points.schema).toEqual({ type: 'array', isArray: true })
    expect(user.fields.points[0].schema).toEqual({ type: 'array', isArray: true })

    // Array array subdocument field (no array properties)
    expect(JSON.stringify(user.fields.points2)).toEqual(JSON.stringify(
      [[{
        x: { type: 'number', isNumber: true },
        schema: { type: 'object', isObject: true }
      }]]
    ))
  })

  test('model setup with default fields', async () => {
    // Setup
    let db = (await opendb(false, { defaultObjects: true })).db

    // Default fields
    expect(db.model('user2', { fields: {} }).fields).toEqual({
      _id: {
        insertOnly: true,
        isId: true,
        type: 'id',
      },
      createdAt: {
        default: expect.any(Function),
        insertOnly: true,
        isInteger: true,
        timestampField: true,
        type: 'integer'
      },
      updatedAt: {
        default: expect.any(Function),
        isInteger: true,
        timestampField: true,
        type: 'integer'
      }
    })
  })

  test('model setup with default objects', async () => {
    // Setup
    let db = (await opendb(false, { defaultObjects: true })).db
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]]
    }})

    // Array schema
    expect(user.fields.pets.schema).toEqual({
      type: 'array',
      isArray: true,
      default: expect.any(Function)
    })

    // Subdocument field and schema
    expect(user.fields.colors).toEqual({
      red: { isString: true, type: 'string' },
      schema: { isObject: true, type: 'object', default: expect.any(Function) }
    })
  })

  test('model setup with schema', async () => {
    // Setup
    let db = (await opendb(false)).db
    let objectSchemaTypeRef = { name: { type: 'string', minLength: 5 } }
    let user = db.model('user', { 
      fields: {
        pet: { ...objectSchemaTypeRef, schema: { virtual: true }}, 
        pets: db.arrayWithSchema(
          [objectSchemaTypeRef],
          { virtual: true },
        ),
      }
    })
    // Object with schema
    expect(user.fields.pet).toEqual({
      name: {
        type: 'string', 
        isString: true,
        minLength: 5,
      },
      schema: {
        type: 'object', 
        isObject: true,
        virtual: true,
      },
    })
    // Array with schema
    expect(user.fields.pets[0]).toEqual({
      name: {
        type: 'string', 
        isString: true,
        minLength: 5,
      },
      schema: {
        type: 'object', 
        isObject: true,
      },
    })
    expect(user.fields.pets.schema).toEqual({
      type: 'array', 
      isArray: true,
      virtual: true,
    })
  })


  test('model reserved rules', async () => {
    // Setup
    let db = (await opendb(false, { hideErrors: true })).db // hide debug error
    let user = db.model('user', {
      fields: {
        name: {
          type: 'string',
          params: {}, // reserved keyword (image plugin)
          paramsUnreserved: {}
        },
      },
      rules: {
        params: (value) => {
          return false // shouldn'r run
        }
      }
    })
    await expect(user.validate({ name: 'Martin' })).resolves.toMatchObject({
      name: 'Martin',
    })
  })

  test('model indexes', async () => {
    // Setup: Need to test different types of indexes
    let db = (await opendb(null)).db
    // Setup: Drop previously tested collections
    if ((await db._db.listCollections().toArray()).find(o => o.name == 'userIndexRaw')) {
      await db._db.collection('userIndexRaw').drop()
    }
    if ((await db._db.listCollections().toArray()).find(o => o.name == 'userIndex')) {
      await db._db.collection('userIndex').drop()
    }

    // Unique & text index (after model initialisation, in serial)
    let userIndexRawModel = db.model('userIndexRaw', {fields: {}})
    await userIndexRawModel._setupIndexes({
      email: { type: 'string', index: 'unique' },
    })
    await userIndexRawModel._setupIndexes({
      name: { type: 'string', index: 'text' },
    })
    let indexes = await db._db.collection('userIndexRaw').indexes()
    expect(indexes[0]).toMatchObject({ v: 2, key: { _id: 1 }, name: '_id_' })
    expect(indexes[1]).toMatchObject({ v: 2, unique: true, key: { email: 1 }, name: 'email_1' })
    expect(indexes[2]).toMatchObject({
      v: 2,
      key: { _fts: 'text', _ftsx: 1 },
      name: 'text',
      weights: { name: 1 },
      default_language: 'english',
      language_override: 'language',
      textIndexVersion: 3
    })

    // Unique & text index
    let userIndexModel = await db.model('userIndex', {
      waitForIndexes: true,
      fields: {
        email: { type: 'string', index: 'unique' },
        name: { type: 'string', index: 'text' },
      }
    })

    let indexes2 = await db._db.collection('userIndex').indexes()
    expect(indexes2[0]).toMatchObject({ v: 2, key: { _id: 1 }, name: '_id_' })
    expect(indexes2[1]).toMatchObject({ v: 2, unique: true, key: { email: 1 }, name: 'email_1' })
    expect(indexes2[2]).toMatchObject({
      v: 2,
      key: { _fts: 'text', _ftsx: 1 },
      name: 'text',
      weights: { name: 1 },
      default_language: 'english',
      language_override: 'language',
      textIndexVersion: 3
    })

    // No text index change error, i.e. new Error('Index with name: text already exists with different options')
    await expect(userIndexModel._setupIndexes({
      name: { type: 'string', index: 'text' },
      name2: { type: 'string', index: 'text' }
    })).resolves.toEqual([{
      'key': { 'name': 'text', 'name2': 'text' },
      'name': 'text',
    }])

    // Text index on a different model
    await expect(userIndexRawModel._setupIndexes({
      name2: { type: 'string', index: 'text' }
    })).resolves.toEqual([{
      'key': {'name2': 'text'},
      'name': 'text',
    }])

    db.close()
  })

  test('model unique indexes', async () => {
    let db = (await opendb(null)).db
    // Setup: Drop previously tested collections
    if ((await db._db.listCollections().toArray()).find(o => o.name == 'userUniqueIndex')) {
      await db._db.collection('userUniqueIndex').drop()
    }

    // Partial unique indexes (allows mulitple null values)
    await db.model('userUniqueIndex', {
      waitForIndexes: true,
      fields: {
        email: {
          type: 'string',
          index: {
            type: 'unique',
            partialFilterExpression: {
              email: { $type: 'string' }
            }
          }
        },
      }
    })

    let indexes2 = await db._db.collection('userUniqueIndex').indexes()
    expect(indexes2[0]).toMatchObject({ v: 2, key: { _id: 1 }, name: '_id_' })
    expect(indexes2[1]).toMatchObject({ v: 2, unique: true, key: { email: 1 }, name: 'email_1' })

    await expect(db.userUniqueIndex.insert({ data: { 'email': 'ricky@orchid.co.nz' }})).resolves.toEqual({
      _id: expect.any(Object),
      email: 'ricky@orchid.co.nz'
    })

    await expect(db.userUniqueIndex.insert({ data: { 'email': 'ricky@orchid.co.nz' }})).rejects.toThrow(
      /E11000 duplicate key error collection: monastery.userUniqueIndex index: email_1 dup key: {/
    )

    await expect(db.userUniqueIndex.insert({ data: { 'email': null }})).resolves.toEqual({
      _id: expect.any(Object),
      email: null
    })

    await expect(db.userUniqueIndex.insert({ data: { 'email': null }})).resolves.toEqual({
      _id: expect.any(Object),
      email: null
    })

    db.close()
  })

  test('model subdocument indexes', async () => {
    // Setup: Need to test different types of indexes
    let db = (await opendb(null)).db
    // Setup: Drop previously tested collections
    if ((await db._db.listCollections().toArray()).find(o => o.name == 'userIndexSubdoc')) {
      await db._db.collection('userIndexSubdoc').drop()
    }
    // Run
    let userModel = await db.model('userIndexSubdoc', {
      fields: {}
    })
    await expect(userModel._setupIndexes(
      {
        animals: {
          name: { type: 'string', index: 'unique' },
        },
        animals2: {
          names: {
            name: { type: 'string', index: 'unique' },
          },
        },
        animals3: {
          names: {
            name: { type: 'string', index: 'text' },
          },
        },
      }, {
        dryRun: true
      }
    )).resolves.toEqual([{
      'key': { 'animals.name': 1 },
      'name': 'animals.name_1',
      'unique': true,
    }, {
      'key': { 'animals2.names.name': 1 },
      'name': 'animals2.names.name_1',
      'unique': true,
    }, {
      'key': { 'animals3.names.name': 'text' },
      'name': 'text',
    }])

    db.close()
  })

  test('model array indexes', async () => {
    // Setup: Need to test different types of indexes
    let db = (await opendb(null)).db
    // Setup: Drop previously tested collections
    if ((await db._db.listCollections().toArray()).find(o => o.name == 'userIndexArray')) {
      await db._db.collection('userIndexArray').drop()
    }
    // Run
    let userModel = await db.model('userIndexArray', {
      fields: {}
    })
    await expect(userModel._setupIndexes(
      {
        animals: [{
          name: { type: 'string', index: 'unique' },
        }],
        animals2: [{ type: 'string', index: true }],
        animals3: [[{ type: 'string', index: true }]],
        animals4: [{
          names: [{
            name: { type: 'string', index: 'unique' },
          }],
        }],
      }, {
        dryRun: true
      }
    )).resolves.toEqual([{
      'key': { 'animals.name': 1 },
      'name': 'animals.name_1',
      'unique': true,
    }, {
      'key': { 'animals2': 1 },
      'name': 'animals2_1',
    }, {
      'key': { 'animals3.0': 1 },
      'name': 'animals3.0_1',
    }, {
      'key': { 'animals4.names.name': 1 },
      'name': 'animals4.names.name_1',
      'unique': true,
    }])

    db.close()
  })

  test('model 2dsphere indexes', async () => {
    // Setup. The tested model needs to be unique as race condition issue arises when the same model
    // with text indexes are setup at the same time
    let db = (await opendb(null)).db
    await db.model('user3', {
      waitForIndexes: true,
      fields: {
        location: {
          index: '2dsphere',
          type: { type: 'string', default: 'Point' },
          coordinates: [{ type: 'number' }] // lat, lng
        },
        location2: {
          index: { type: '2dsphere' }, // opts...
          type: { type: 'string', default: 'Point' },
          coordinates: [{ type: 'number' }] // lat, lng
        }
      }
    })

    // Schema check
    expect(db.user3.fields.location).toEqual({
      type: { type: 'string', default: 'Point', isString: true },
      coordinates: expect.any(Array),
      schema: {
        default: undefined,
        index: '2dsphere',
        isObject: true,
        nullObject: undefined,
        type: 'object'
      }
    })
    expect(db.user3.fields.location2).toEqual({
      type: { type: 'string', default: 'Point', isString: true },
      coordinates: expect.any(Array),
      schema: {
        default: undefined,
        index: { type: '2dsphere' },
        isObject: true,
        nullObject: undefined,
        type: 'object'
      }
    })

    // Insert 2dsphere point data
    await expect(db.user3.insert({
      data: {
        location: { coordinates: [172.5880385, -43.3311608] }
      }
    })).resolves.toEqual({
       _id: expect.any(Object),
       location: {
         coordinates: [172.5880385, -43.3311608],
         type: 'Point'
       },
    })
    // Insert no 2dsphere point data
    await expect(db.user3.insert({
      data: {}
    })).resolves.toEqual({
       _id: expect.any(Object),
    })
    // Insert bad 2dsphere point data
    let MongoError = require('mongodb').MongoError
    let id = db.id()
    await expect(db.user3.insert({
      data: { _id: id, location: {} },
      blacklist: ['-_id'],
    })).rejects.toEqual(
      new MongoError(
        `Can't extract geo keys: { _id: ObjectId('${String(id)}'), location: { type: "Point" } }` +
        '  Point must be an array or object'
      )
    )

    db.close()
  })

}
