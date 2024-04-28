// timestamps = false here and test for true??? OR test timestamps = false
const Model = require('../lib/model.js')
const monastery = require('../lib/index.js')

let db
beforeAll(async () => { db = monastery('127.0.0.1/monastery') })
afterAll(async () => { db.close() })

test('model > model on manager', async () => {
  db.model('user', { fields: {} })
  let modelNamedConflict = db.model('open', { fields: {} })

  // Model added to manager[model]
  expect(db.user).toEqual(expect.any(Object))
  expect(db.models.user).toEqual(expect.any(Object))

  // Model with a name conflict is only added to manager.models[name]
  expect(db.open).toEqual(expect.any(Function))
  expect(db.models.open).toEqual(modelNamedConflict)
})

test('model setup', async () => {
  // Setup
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
  const db2 = monastery('127.0.0.1/monastery', { defaultObjects: true })
  let user = db2.model('user', { fields: {
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
  db2.close()
})

test('model setup with schema', async () => {
  // Setup
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

test('model setup with messages', async () => {
  let user = db.model('user', {
    fields: {
      name: { type: 'string' },
    },
    messages: {
      // these are sorted when trhe model's initialised
      'cats.name': {},       

      'dogs.name': {},       
      'dogs.$.name': {},     
      'dogs.1.name': {},     
      'dogs.$': {},          
      'dogs.1': {},          

      'pigs.name': {},       
      'pigs.$.name': {},     
      'pigs.1.name': {},     
      'pigs.2.name': {},     

      'gulls.$.1.$': {},     
      'gulls.1.$.1': {},     
      'gulls.$': {},         
      'gulls.$.$': {},       
      'gulls.$.$.1': {},     
      'gulls.$.1': {},       
      'gulls.1.$': {},       
      'gulls.1.1': {},       
      'gulls.1.1.$': {},     
      'gulls.name': {},      
      'gulls.$.name': {},    
    },
  })
  // Object with schema
  // console.log(user.messages)
  expect(Object.keys(user.messages)).toEqual([
    'cats.name',
    'dogs.name',
    'dogs.1.name',
    'dogs.1',
    'pigs.name',
    'pigs.1.name',
    'pigs.2.name',
    'gulls.1.1',
    'gulls.name',
    'gulls.1.1.$',
    'gulls.1.$.1',
    'gulls.1.$',
    'dogs.$.name',
    'dogs.$',
    'pigs.$.name',
    'gulls.$',
    'gulls.$.1',
    'gulls.$.name',
    'gulls.$.1.$',
    'gulls.$.$',
    'gulls.$.$.1',
  ])

  expect(user.messages).toEqual({
    // these are sorted in model initialisation
    'cats.name': {
      'regex': /^cats\.name$/,
    },
    'dogs.$': {
      'regex': /^dogs\.[0-9]+$/,
    },
    'dogs.$.name': {
      'regex': /^dogs\.[0-9]+\.name$/,
    },
    'dogs.1': {
      'regex': /^dogs\.1$/,
    },
    'dogs.1.name': {
      'regex': /^dogs\.1\.name$/,
    },
    'dogs.name': {
      'regex': /^dogs\.name$/,
    },
    'gulls.$': {
      'regex': /^gulls\.[0-9]+$/,
    },
    'gulls.$.$': {
      'regex': /^gulls\.[0-9]+\.[0-9]+$/,
    },
    'gulls.$.$.1': {
      'regex': /^gulls\.[0-9]+\.[0-9]+\.1$/,
    },
    'gulls.$.1': {
      'regex': /^gulls\.[0-9]+\.1$/,
    },
    'gulls.$.1.$': {
      'regex': /^gulls\.[0-9]+\.1\.[0-9]+$/,
    },
    'gulls.$.name': {
      'regex': /^gulls\.[0-9]+\.name$/,
    },
    'gulls.1.$': {
      'regex': /^gulls\.1\.[0-9]+$/,
    },
    'gulls.1.$.1': {
      'regex': /^gulls\.1\.[0-9]+\.1$/,
    },
    'gulls.1.1': {
      'regex': /^gulls\.1\.1$/,
    },
    'gulls.1.1.$': {
      'regex': /^gulls\.1\.1\.[0-9]+$/,
    },
    'gulls.name': {
      'regex': /^gulls\.name$/,
    },
    'pigs.$.name': {
      'regex': /^pigs\.[0-9]+\.name$/,
    },
    'pigs.1.name': {
      'regex': /^pigs\.1\.name$/,
    },
    'pigs.2.name': {
      'regex': /^pigs\.2\.name$/,
    },
    'pigs.name': {
      'regex': /^pigs\.name$/,
    },
  })
})

test('model reserved rules', async () => {
  // Setup
  // let db = (await opendb(false, { hideErrors: true })).db // hide debug error
  let user = db.model('user-model', {
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
  await expect(user.validate({ name: 'Martin' })).resolves.toEqual({
    name: 'Martin',
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
})

test('model indexes', async () => {
  // Setup: Need to test different types of indexes
  // Setup: Drop previously tested collections
  const allCollections = await db.db.listCollections().toArray()
  if (allCollections.find(o => o.name == 'userIndexRaw')) {
    await db.db.collection('userIndexRaw').drop()
  }
  if (allCollections.find(o => o.name == 'userIndex')) {
    await db.db.collection('userIndex').drop()
  }

  // mongodb connection error
  await expect(Model.prototype._setupIndexes.call(
    { name: 'colnamehere', manager: null }, 
    { name: { type: 'string', index: 'text' }}
  )).rejects.toThrow('Skipping createIndex on the \'colnamehere\' model, no mongodb connection found.')

  // Unique & text index (after model initialisation, in serial)
  let userIndexRawModel = db.model('userIndexRaw', { fields: {} })
  await userIndexRawModel._setupIndexes({ email: { type: 'string', index: 'unique' } })
  await userIndexRawModel._setupIndexes({ name: { type: 'string', index: 'text' } })
  let indexes = await (db.get('userIndexRaw').indexes())
  expect(indexes[0]).toEqual({ 
    v: 2, 
    key: { _id: 1 }, 
    name: '_id_',
  })
  expect(indexes[1]).toEqual({ 
    v: 2, 
    unique: true, 
    key: { email: 1 }, 
    name: 'email_1',
  })
  expect(indexes[2]).toEqual({
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

  let userIndexModelIndexes = await db.db.collection('userIndex').indexes()
  expect(userIndexModelIndexes[0]).toEqual({ 
    v: 2, 
    key: { _id: 1 }, 
    name: '_id_',
  })
  expect(userIndexModelIndexes[1]).toEqual({ 
    v: 2, 
    unique: true, 
    key: { email: 1 }, 
    name: 'email_1',
  })
  expect(userIndexModelIndexes[2]).toEqual({
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
})

test('model unique indexes', async () => {
  // Setup: Drop previously tested collections
  if ((await db.db.listCollections().toArray()).find(o => o.name == 'userUniqueIndex')) {
    await db.db.collection('userUniqueIndex').drop()
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

  let indexes2 = await db.db.collection('userUniqueIndex').indexes()
  expect(indexes2[0]).toEqual({ 
    v: 2, 
    key: { _id: 1 }, 
    name: '_id_',
  })
  expect(indexes2[1]).toEqual({ 
    v: 2, 
    unique: true, 
    key: { email: 1 }, 
    name: 'email_1',
    partialFilterExpression: { 
      email: { '$type': 'string' }
    },
  })

  await expect(db.userUniqueIndex.insert({ data: { 'email': 'email@domain.co.nz' }})).resolves.toEqual({
    _id: expect.any(Object),
    createdAt: expect.any(Number),
    email: 'email@domain.co.nz',
    updatedAt: expect.any(Number),
  })

  await expect(db.userUniqueIndex.insert({ data: { 'email': 'email@domain.co.nz' }})).rejects.toThrow(
    /E11000 duplicate key error collection: monastery.userUniqueIndex index: email_1 dup key: {/
  )

  await expect(db.userUniqueIndex.insert({ data: { 'email': null }})).resolves.toEqual({
    _id: expect.any(Object),
    createdAt: expect.any(Number),
    email: null,
    updatedAt: expect.any(Number),
  })

  await expect(db.userUniqueIndex.insert({ data: { 'email': null }})).resolves.toEqual({
    _id: expect.any(Object),
    createdAt: expect.any(Number),
    email: null,
    updatedAt: expect.any(Number),
  })
})

test('model subdocument indexes', async () => {
  // Setup: Need to test different types of indexes
  // Setup: Drop previously tested collections
  if ((await db.db.listCollections().toArray()).find(o => o.name == 'userIndexSubdoc')) {
    await db.db.collection('userIndexSubdoc').drop()
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
})

test('model array indexes', async () => {
  // Setup: Need to test different types of indexes
  // Setup: Drop previously tested collections
  if ((await db.db.listCollections().toArray()).find(o => o.name == 'userIndexArray')) {
    await db.db.collection('userIndexArray').drop()
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
})

test('model 2dsphere indexes', async () => {
  // Setup. The tested model needs to be unique as race condition issue arises when the same model
  // with text indexes are setup at the same time
  await db.model('user99', {
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
  expect(db.user99.fields.location).toEqual({
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
  expect(db.user99.fields.location2).toEqual({
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
  await expect(db.user99.insert({
    data: {
      location: { coordinates: [172.5880385, -43.3311608] }
    }
  })).resolves.toEqual({
    _id: expect.any(Object),
    createdAt: expect.any(Number),
    location: {
      coordinates: [172.5880385, -43.3311608],
      type: 'Point'
    },
    updatedAt: expect.any(Number),
  })
  // Insert no 2dsphere point data
  await expect(db.user99.insert({
    data: {}
  })).resolves.toEqual({
    _id: expect.any(Object),
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
  // Insert bad 2dsphere point data
  let id = db.id()
  await expect(db.user99.insert({
    data: { _id: id, location: {} },
    blacklist: ['-_id'],
  })).rejects.toThrow(
    new RegExp(
      `Can't extract geo keys: { _id: ObjectId\\('${String(id)}'\\), createdAt: [0-9]+, updatedAt: [0-9]+, ` +
      'location: { type: "Point" } }  Point must be an array or object'
    )
  )
})
