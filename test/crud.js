// todo: test defaultObejcts=true, milliseconds=true, timestamps=true, nullObjects=true in seperate tests
const monastery = require('../lib/index.js')

let db
beforeAll(async () => { db = monastery('127.0.0.1/monastery', { timestamps: false }) })
afterAll(async () => { db.close() })

test('insert basics', async () => {
  let db2 = monastery('127.0.0.1/monastery', { timestamps: false }) 
  let user = db2.model('user', { fields: {
    name: { type: 'string' },
    names: [{ type: 'string' }],
    animals: {
      dog: { type: 'string' },
      dogs: [{ name: { type: 'string' } }],
    },
  }})

  // pass: insert one
  let inserted = await user.insert({ data: { name: 'Martin Luther' }})
  expect(inserted).toEqual({
    _id: expect.any(Object),
    name: 'Martin Luther',
  })

  // pass: insert multiple
  let inserted2 = await user.insert({ data: [{ name: 'Martin Luther1' }, { name: 'Martin Luther2' }]})
  expect(inserted2).toEqual([
    { _id: inserted2[0]._id, name: 'Martin Luther1' }, 
    { _id: inserted2[1]._id, name: 'Martin Luther2' },
  ])

  // pass: empty data object
  let inserted3 = await user.insert({ data: {} })
  expect(inserted3).toEqual({
    _id: inserted3._id,
  })

  // pass: No data object
  let inserted4 = await user.insert({})
  expect(inserted4).toEqual({
    _id: inserted4._id,
  })

  // pass: No arguments
  let inserted5 = await user.insert()
  expect(inserted5).toEqual({
    _id: inserted5._id,
  })

  db2.close()
})

test('insert option defaultObjects', async () => {
  let db2 = monastery('127.0.0.1/monastery', { defaultObjects: true, timestamps: false })
  let schema = { 
    fields: {
      name: { type: 'string' },
      names: [{ type: 'string' }],
      animals: {
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }],
      },
    },
  }
  let user1 = db.model('user', schema)
  let user2 = db2.model('user', schema)

  // defaultObjects off (default)
  let inserted1 = await user1.insert({ data: {} })
  expect(inserted1).toEqual({
    _id: inserted1._id,
  })

  // defaultObjects on
  let inserted2 = await user2.insert({ data: {} })
  expect(inserted2).toEqual({
    _id: inserted2._id,
    names: [],
    animals: { dogs: [] },
  })
  db2.close()
})

test('insert option timestamps', async () => {
  let db2 = monastery('127.0.0.1/monastery', { timestamps: true })
  let schema = { 
    fields: {
      name: { type: 'string' },
    },
  }
  let user1 = db.model('user', schema)
  let user2 = db2.model('user', schema)

  // timestamps off (default)
  let inserted1 = await user1.insert({ data: {} })
  expect(inserted1).toEqual({
    _id: inserted1._id,
  })

  // timestamps on
  let inserted2 = await user2.insert({ data: {} })
  expect(inserted2).toEqual({
    _id: inserted2._id,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
  db2.close()
})

test('insert id casting', async () => {
  db.model('company', { 
    fields: {
      name: { type: 'string' },
    },
  })
  let user = db.model('user', { fields: {
    randomId: { type: 'id' },
    company: { model: 'company' },
    companies: [{ model: 'company' }],
  }})

  let id = '5edf17ff7e2d5020913f98cc'
  let inserted = await user.insert({ data: { randomId: id, company: id, companies: [id] } })

  expect(inserted).toEqual({
    _id: inserted._id,
    randomId: db.id(id),
    company: db.id(id),
    companies: [db.id(id)],
  })
})

test('find defaults', async () => {
  // Todo: take out and group query/id parsing tests
  let user = db.model('user-find', {
    fields: {
      name: { type: 'string' },
    },
  })

  // Insert one
  let inserted = await user._insert({ name: 'Martin Luther' })
  // Insert multiple
  let inserted2 = await user._insert([{ name: 'Martin Luther1' }, { name: 'Martin Luther2' }])

  // Find (basic match)
  let find = await user.find({ query: { name: 'Martin Luther' }})
  expect(find[0]).toEqual({ _id: find[0]._id, name: 'Martin Luther' }) // no timestamps

  // Find (empty query)
  let find2 = await user.find({ query: {} })
  expect(find2.length).toBeGreaterThan(0)

  // Find (id)
  let find3 = await user.find({ query: inserted._id })
  expect(find3).toEqual({ _id: inserted._id, name: 'Martin Luther' })

  // Find (id string)
  let find4 = await user.find({ query: inserted._id.toString() })
  expect(find4).toEqual({ _id: inserted._id, name: 'Martin Luther' })

  // Find (id expansion)
  let find5 = await user.find(inserted2[0]._id)
  expect(find5).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })

  // Find (id string expansion)
  let find6 = await user.find(inserted2[0]._id.toString())
  expect(find6).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })

  // Bad ids
  let badIdOrQuery = 'Please pass an object or MongoId to options.query'
  await expect(user.find()).rejects.toThrow(badIdOrQuery)
  await expect(user.find(1)).rejects.toThrow(badIdOrQuery)
  await expect(user.find(null)).rejects.toThrow(badIdOrQuery)
  await expect(user.find(undefined)).rejects.toThrow(badIdOrQuery)
  await expect(user.find({})).rejects.toThrow(badIdOrQuery)
  await expect(user.find({ query: null })).rejects.toThrow(badIdOrQuery)
  await expect(user.find({ query: undefined })).rejects.toThrow(badIdOrQuery)
  await expect(user.find({ query: { _id: undefined }})).rejects.toThrow(badIdOrQuery)

  // Parseable
  await expect(user.find('')).resolves.toEqual(null)
  await expect(user.find('invalid-id')).resolves.toEqual(null)
  await expect(user.find({ query: '' })).resolves.toEqual(null)
  await expect(user.find({ query: { _id: '' }})).resolves.toEqual(null)
  await expect(user.find({ query: { _id: null }})).resolves.toEqual([]) // should throw error

  // FindOne (query id)
  let findOne = await user.findOne({ query: inserted._id })
  expect(findOne).toEqual({ _id: inserted._id, name: 'Martin Luther' })

  // Findone (id)
  let findOne2 = await user.findOne(inserted2[0]._id)
  expect(findOne2).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })

  // Findone (id string)
  let findOne3 = await user.findOne(inserted2[0]._id.toString())
  expect(findOne3).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })
})

test('find default field population', async () => {
  db.model('user', {
    fields: {
      name: { type: 'string', default: 'Martin Luther' },
      addresses: [{ city: { type: 'string' }, country: { type: 'string', default: 'Germany' } }],
      address: { country:  { type: 'string', default: 'Germany' }},
      pet:  { dog: { model: 'dog' }},
      pets:  { dog: [{ model: 'dog' }]},
      dogs: [{ model: 'dog' }], // virtual association
    },
  })
  db.model('dog', {
    fields: {
      name: { type: 'string', default: 'Scruff' },
      user: { model: 'user' },
    },
  })

  // Default field doesn't override null
  let nulldoc1 = await db.dog.insert({ data: { name: null }})
  let nullfind1 = await db.dog.findOne({ query: nulldoc1._id })
  expect(nullfind1).toEqual({ _id: nulldoc1._id, name: null })

  // Default field doesn't override empty string
  let nulldoc2 = await db.dog.insert({ data: { name: '' }})
  let nullfind2 = await db.dog.findOne({ query: nulldoc2._id })
  expect(nullfind2).toEqual({ _id: nulldoc2._id, name: '' })

  // Default field overrides undefined
  let nulldoc3 = await db.dog.insert({ data: { name: undefined }})
  let nullfind3 = await db.dog.findOne({ query: nulldoc3._id })
  expect(nullfind3).toEqual({ _id: nullfind3._id, name: 'Scruff' })

  // Default field population test
  // Note that addresses.1.country shouldn't be overridden
  // Insert documents (without defaults)
  let dog1 = await db.dog._insert({})
  let dog2 = await db.dog._insert({})
  let user1 = await db.user._insert({
    addresses: [
      { city: 'Frankfurt' },
      { city: 'Christchurch', country: 'New Zealand' },
    ],
    pet: { dog: dog1._id },
    pets: { dog: [dog1._id, dog2._id]},
  })
  await db.dog._update(dog1._id, { $set: { user: user1._id }})

  let find1 = await db.user.findOne({
    query: user1._id,
    populate: ['pet.dog', 'pets.dog', {
      from: 'dog',
      localField: '_id',
      foreignField: 'user',
      as: 'dogs',
    }],
  })
  expect(find1).toEqual({
    _id: user1._id,
    name: 'Martin Luther',
    addresses: [
      { city: 'Frankfurt', country: 'Germany' },
      { city: 'Christchurch', country: 'New Zealand' },
    ],
    address: { country: 'Germany' },
    pet: { dog: { _id: dog1._id, name: 'Scruff', user: user1._id }},
    pets: {
      dog: [
        { _id: dog1._id, name: 'Scruff', user: user1._id },
        { _id: dog2._id, name: 'Scruff' },
      ],
    },
    dogs: [{ _id: dog1._id, name: 'Scruff', user: user1._id }],
  })
})

test('find default field blacklisted', async () => {
  db.model('user', {
    fields: {
      name: { type: 'string', default: 'Martin Luther' },
      addresses: [{ city: { type: 'string' }, country: { type: 'string', default: 'Germany' } }],
      address: { country:  { type: 'string', default: 'Germany' }},
      pet:  { dog: { model: 'dog' }},
      pets:  { dog: [{ model: 'dog' }]},
      dogs: [{ model: 'dog' }], // virtual association
    },
  })
  db.model('dog', {
    fields: {
      age: { type: 'number', default: 12 },
      name: { type: 'string', default: 'Scruff' },
      user: { model: 'user' },
    },
    findBL: ['age'],
  })
  let dog1 = await db.dog._insert({})
  let dog2 = await db.dog._insert({})
  let user1 = await db.user._insert({
    addresses: [
      { city: 'Frankfurt' },
      { city: 'Christchurch', country: 'New Zealand' },
    ],
    pet: { dog: dog1._id },
    pets: { dog: [dog1._id, dog2._id]},
  })
  await db.dog._update(dog1._id, { $set: { user: user1._id }})

  // Blacklisted direct/populated default fields (should be removed)
  let find2 = await db.user.findOne({
    query: user1._id,
    populate: [
      'pet.dog', 
      'pets.dog', 
      {
        from: 'dog',
        localField: '_id',
        foreignField: 'user',
        as: 'dogs',
      },
    ],
    blacklist: ['address', 'addresses.country', 'pets.dog.name', 'dogs.name'],
    // ^ great test (address should cancel addresses if not stopping at the .)
  })
  expect(find2).toEqual({
    _id: user1._id,
    name: 'Martin Luther',
    addresses: [{ city: 'Frankfurt' }, { city: 'Christchurch' }],
    pet: { dog: { _id: dog1._id, name: 'Scruff', user: user1._id }},
    dogs: [{ _id: dog1._id, user: user1._id }],
    pets: {
      dog: [
        { _id: dog1._id, user: user1._id }, //, age, name
        { _id: dog2._id }, //, age, name
      ],
    },
  })
})

test('update general', async () => {
  let user = db.model('user', {
    fields: {
      name: { type: 'string' },
    },
  })

  // Insert
  let inserted = await user.insert({ data: { name: 'Martin Luther' }})
  expect(inserted).toEqual({
    _id: expect.any(Object),
    name: 'Martin Luther',
  })

  // Insert multiple
  let inserted2 = await user.insert({ data: [{ name: 'Martin Luther1' }, { name: 'Martin Luther2' }]})
  expect(inserted2).toEqual([
    {
      _id: expect.any(Object),
      name: 'Martin Luther1',
    }, {
      _id: expect.any(Object),
      name: 'Martin Luther2',
    },
  ])

  // Update
  await expect(user.update({ query: inserted._id, data: { name: 'Martin Luther2' }}))
    .resolves.toEqual({ name: 'Martin Luther2' })

  // Update (no/empty data object)
  await expect(user.update({ query: inserted._id, data: {}}))
    .rejects.toThrow('No valid data passed to user.update({ data: .. })')

  await expect(user.update({ query: inserted._id }))
    .rejects.toThrow('Please pass an update operator to user.update(), e.g. data, $unset, etc')

  // Update multiple
  await user.update({
    query: { _id: { $in: [inserted2[0]._id, inserted2[1]._id] }},
    data: { name: 'Martin Luther3' },
    multi: true,
  })
  let findUpdated2 = await user.find({
    query: { _id: { $in: [inserted2[0]._id, inserted2[1]._id] }},
  })
  expect(findUpdated2).toEqual([
    {
      _id: expect.any(Object),
      name: 'Martin Luther3',
    }, {
      _id: expect.any(Object),
      name: 'Martin Luther3',
    },
  ])

  // Upsert
  let newId = db.id()
  await expect(user.update({ query: newId, data: { name: 'Martin Luther3' }, upsert: true }))
    .resolves.toEqual({ _id: newId, name: 'Martin Luther3' }) // inserted

  await expect(user.update({ query: inserted._id, data: { name: 'Martin Luther4' }, upsert: true }))
    .resolves.toEqual({ name: 'Martin Luther4' }) // updated
})

test('update defaults', async () => {
  const db2 = monastery('127.0.0.1/monastery', { useMilliseconds: true })
  let user = db2.model('user', {
    fields: {
      name: { type: 'string' },
    },
  })
  let inserted = await user.insert({
    data: {},
  })
  expect(inserted).toEqual({
    _id: inserted._id,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
  // Default field
  // await util.wait(1000)
  let updated = await user.update({
    query: inserted._id,
    data: { name: 'Bruce' },
  })
  expect(updated).toEqual({
    name: 'Bruce',
    updatedAt: expect.any(Number),
  })
  expect(updated.updatedAt && updated.updatedAt != inserted.updatedAt).toEqual(true)

  // Empty data (still contains updatedAt)
  let updated2 = await user.update({
    query: inserted._id,
    data: {},
  })
  expect(updated2).toEqual({
    updatedAt: expect.any(Number),
  })

  // Empty data (with no timestamps)
  await expect(user.update({
    query: inserted._id,
    data: {},
    timestamps: false,
  })).rejects.toThrow('No valid data passed to user.update({ data: .. })')

  // UpdatedAt override (wont work)
  let updated4 = await user.update({
    query: inserted._id,
    data: { updatedAt: 1 },
  })
  expect(updated4.updatedAt > 1).toEqual(true)

  // UpdatedAt override
  let updated5 = await user.update({
    query: inserted._id,
    data: { updatedAt: 1 },
    timestamps: false,
  })
  expect(updated5.updatedAt).toEqual(1)
  db2.close()
})

test('update operators', async () => {
  let user = db.model('userOperators', {
    fields: {
      name: { type: 'string', minLength: 5 },
      age: { type: 'number' },
    },
    beforeValidate: [(data, next) => { beforeValidateHookCalled = true; next() }],
  })

  let inserted = await user.insert({
    data: { name: 'Bruce', age: 12 },
  })

  // No data object, but has another update operators
  await expect(user.update({ query: inserted._id, $set: { name: 'bruce' }}))
    .resolves.toEqual({ name: 'bruce' })

  // Mixing data and $set, and $set skips validation (minLength)
  await expect(user.update({ query: inserted._id, data: { name: 'bruce2', age: 12 }, $set: { name: 'john' }}))
    .resolves.toEqual({ age: 12, name: 'john' })

  // Two operators
  await user.update({ query: inserted._id, $set: { name: 'john' }, $unset: { age: 1 }})
  await expect(user.findOne({ query: inserted._id })).resolves.toEqual({
    _id: expect.any(Object),
    name: 'john',
  })

  // $pull on a non array (also gets passed no valid data check)
  await expect(user.update({ query: inserted._id, $pull: { name: 'bruce' }}))
    .rejects.toThrow('Cannot apply $pull to a non-array value')

  // Non-data operators don't call beforeValidate
  var beforeValidateHookCalled = false
  await user.update({ query: inserted._id, data: { name: 'bruce' }})
  expect(beforeValidateHookCalled).toEqual(true)
  beforeValidateHookCalled = false
  await user.update({ query: inserted._id, $set: { name: 'bruce' }})
  expect(beforeValidateHookCalled).toEqual(false)
})

test('update mixing formData', async() => {
  // Mixing data
  let consignment = db.model('consignment', {
    fields: {
      specialInstructions: [{
        text: { type: 'string' },
        createdAt: { type: 'date' },
        updatedByName: { type: 'string' },
        importance: { type: 'string' },
      }],
    },
  })
  let inserted = await consignment.insert({
    data: {
      specialInstructions: [{
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      }],
    },
  })
  let specialInstructions = [
    {
      text: 'POD added by driver',
      createdAt: 1653603212886,
      updatedByName: 'Paul Driver 3',
      importance: 'low',
    }, {
      text: 'filler',
      createdAt: 1653601752472,
      updatedByName: 'Paul',
      importance: 'low',
    },
  ]
  // Key order maintained (not always guaranteed in browsers)
  await consignment.update({
    query: inserted._id,
    data: {
      'specialInstructions[0][text]': 'filler',
      'specialInstructions[0][createdAt]': 1653601752472,
      'specialInstructions[0][updatedByName]': 'Paul',
      'specialInstructions[0][importance]': 'low',
      specialInstructions: specialInstructions.map(o => ({ ...o })),
    },
  })
  await expect(consignment.findOne({ query: inserted._id })).resolves.toEqual({
    _id: expect.any(Object),
    specialInstructions: specialInstructions,
  })

  // Key order maintained (not always guaranteed in browsers)
  await consignment.update({
    query: inserted._id,
    data: {
      specialInstructions: specialInstructions.map(o => ({ ...o })),
      'specialInstructions[0][text]': 'filler',
      'specialInstructions[0][createdAt]': 1653601752472,
      'specialInstructions[0][updatedByName]': 'Paul',
      'specialInstructions[0][importance]': 'low',
    },
  })
  await expect(consignment.findOne({ query: inserted._id })).resolves.toEqual({
    _id: expect.any(Object),
    specialInstructions: [specialInstructions[1], specialInstructions[1]],
  })
})

test('update large document', async () => {
  // todo: sereach util.deepCopy
  // todo: check castIds and any other recursive functions
  // todo: move default fields to before validate
  db.model('a', { fields: {} })
  db.model('b', { fields: {} })
  db.model('c', { fields: {} })
  db.model('d', { fields: {} })
  db.model('e', { fields: {} })
  try {
    var large = db.model('large', require('../resources/fixtures/large-definition.js'))
    var largePayload = require('../resources/fixtures/large-payload.json')
  } catch (e) {
    // ignore publicly for now
    return
  }
  // Insert
  let inserted = await large._insert({})
  // Update
  // console.time('update large document')
  let update = await large.update({
    query: inserted._id,
    data: largePayload,
  })
  // console.timeEnd('update large document')
  // Check
  await expect(update).toEqual(removePrunedProperties(largePayload))
  // Find
  // console.time('find large document')
  // await large.findOne({
  //   query: inserted._id,
  // })
  // console.timeEnd('find large document')

  function removePrunedProperties(entity) {
    for (let entitiesKey of [
      'components', 'connections', 'bridges', 'openings', 'spaces', 'elements', 'elementTypes', 
      'categories', 'typologies',
    ]) {
      if (entity[entitiesKey]) {
        for (let i=0, l=entity[entitiesKey].length; i<l; i++) {
          entity[entitiesKey][i] = removePrunedProperties(entity[entitiesKey][i])
        }
      }
    }
    // remove actually keys
    if (entity.metrics) {
      for (let key in entity.metrics) {
        delete entity.metrics[key].actually
      }
    }
    if (entity.code?.match(/^(ELEM|CAT)/)) {
      delete entity.name
    }
    // // convert _id to ObjectId
    // if (entity._id) {
    //   entity._id = db.id(entity._id)
    // }
    return entity
  }
})

test('findOneAndUpdate general', async () => {
  // todo: test all findOneAndUpdate options (e.g. array population)
  // todo: test find & update hooks
  let dog = db.model('dog', {
    fields: {
      name: { type: 'string', default: 'Scruff' },
    },
  })
  let user = db.model('user', {
    fields: {
      name: { type: 'string', default: 'Martin' },
      dog: { model: 'dog' },
    },
  })

  // Returns omitted field after update, i.e. dog
  let dog1 = await dog.insert({ data: {} })
  let user1 = await user.insert({ data: { dog: dog1._id }})
  expect(await user.findOneAndUpdate({ query: { _id: user1._id }, data: { name: 'Martin2' }})).toEqual({
    _id: user1._id,
    name: 'Martin2',
    dog: dog1._id,
  })

  // Returns omitted field requiring population after update, i.e. dog
  expect(await user.findOneAndUpdate({
    query: { _id: user1._id },
    data: { name: 'Martin2' },
    populate: ['dog'],
  })).toEqual({
    _id: user1._id,
    name: 'Martin2',
    dog: {
      _id: dog1._id,
      name: 'Scruff',
    },
  })

  // Error finding document to update
  expect(await user.findOneAndUpdate({
    query: { _id: db.id() },
    data: { name: 'Martin2' },
  })).toEqual(null)

  // Error finding document to update (populate)
  expect(await user.findOneAndUpdate({
    query: { _id: db.id() },
    data: { name: 'Martin2' },
    populate: ['dog'],
  })).toEqual(null)
})

test('remove defaults', async () => {
  let user = db.model('userRemove', {
    fields: {
      name: { type: 'string' },
    },
  })

  // Clear (incase of failed a test)
  user._remove({}, { multi: true })

  // Insert multiple
  let inserted = await user.insert({ data: [
    { name: 'Martin' }, 
    { name: 'Martin' }, 
    { name: 'Martin' }, 
    { name: 'Martin' },
  ]})
  expect(inserted).toEqual([
    { _id: expect.any(Object), name: 'Martin' }, 
    { _id: expect.any(Object), name: 'Martin' }, 
    { _id: expect.any(Object), name: 'Martin' },
    { _id: expect.any(Object), name: 'Martin' },
  ])

  // Remove one by id
  await expect(user.remove({ query: inserted[0]._id }))
    .resolves.toEqual({ acknowledged: true, deletedCount: 1 })

  // Remove one
  await expect(user.remove({ query: { name: 'Martin' }, multi: false }))
    .resolves.toEqual({ acknowledged: true, deletedCount: 1 })

  // Remove many (default)
  await expect(user.remove({ query: { name: 'Martin' } }))
    .resolves.toEqual({ acknowledged: true, deletedCount: 2 })
})

test('count defaults', async () => {
  let user = db.model('userCount', {
    fields: {
      name: { type: 'string' },
    },
  })

  // Clear
  await user._remove({}, { multi: true })

  // Insert multiple
  let inserted = await user.insert({ data: [
    { name: 'Martin' }, 
    { name: 'Martin' }, 
    { name: 'Martin2' }, 
    { name: 'Martin2' },
  ]})

  // Count one by id
  await expect(user.count({ query: inserted[0]._id }))
    .resolves.toEqual(1)

  // Count many (default)
  await expect(user.count({ query: { name: 'Martin' } }))
    .resolves.toEqual(2)
})

test('hooks > basic', async () => {
  let user = db.model('user', {
    fields: {
      first: { type: 'string'},
      last: { type: 'string'},
    },
    beforeInsert: [(data, next) => {
      if (!data.first) {
        next(new Error('beforeInsert error 1..'))
      } else if (!data.last) {
        setTimeout(function() {
          next(new Error('beforeInsert error 2..'))
        }, 100)
      } else {
        next()
      }
    }],
    beforeUpdate: [(data, next) => {
      if (!data.first) {
        next(new Error('beforeUpdate error 1..'))
      } else if (!data.last) {
        setTimeout(function() {
          next(new Error('beforeUpdate error 2..'))
        }, 100)
      } else {
        next()
      }
    }],
    beforeRemove: [(next) => {
      next(new Error('beforeRemove error..'))
    }],
    afterFind: [(data, next) => {
      next()
    }],
  })
  let userDoc = await user.insert({ data: { first: 'Martin', last: 'Luther' }})

  // Catch insert (a)synchronous errors thrown in function or through `next(err)`
  await expect(user.insert({ data: { first: '' } })).rejects.toThrow('beforeInsert error 1..')
  await expect(user.insert({ data: { first: 'Martin' } })).rejects.toThrow('beforeInsert error 2..')
  await expect(user.insert({ data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin',
    last: 'Luther',
  })

  // Catch update (a)synchronous errors thrown in function or through `next(err)`
  await expect(user.update({ query: userDoc._id, data: { first: '' } }))
    .rejects.toThrow('beforeUpdate error 1..')
  await expect(user.update({ query: userDoc._id, data: { first: 'Martin' } }))
    .rejects.toThrow('beforeUpdate error 2..')
  await expect(user.update({ query: userDoc._id, data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
    first: 'Martin',
    last: 'Luther',
  })

  // Catch remove synchronous errors through `next(err)`
  await expect(user.remove({ query: userDoc._id })).rejects.toThrow('beforeRemove error..')

  // After find continues series
  await expect(user.find({ query: userDoc._id })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin',
    last: 'Luther',
  })

  // beforeUpdate/beforeInsert should have access to the original non-validated data
  let user2 = db.model('user2', {
    fields: {
      first: { type: 'string' },
    },
    beforeInsert: [function (data, next) {
      if (this.data.bad === true && !data.bad) next(new Error('error1'))
      else next()
    }],
    beforeUpdate: [function (data, next) {
      if (this.data.bad === true && !data.bad) next(new Error('error2'))
      else next()
    }],
  })
  let userDoc2 = await user2._insert({ first: 'M' })
  await expect(user2.insert({ data: { first: 'M' } })).resolves.toEqual({ _id: expect.any(Object), first: 'M' })
  await expect(user2.insert({ data: { first: 'M', bad: true } })).rejects.toThrow('error1')
  await expect(user2.update({ query: userDoc2._id, data: { first: 'MM'  } })).resolves.toEqual({ first: 'MM' })
  await expect(user2.update({ query: userDoc2._id, data: { first: 'M', bad: true } })).rejects.toThrow('error2')
})

test('hooks > chained values', async () => {
  let bookCount = 0
  const afterInsertAsync = [
    async (data) => {
      return // ignored
    },
    async (data) => {
      data.first = 'Martin11'
    },
    async (data) => {
      expect(data.first).toEqual('Martin11')
      return { ...data, first: 'Martin' }
    },
    async (data) => {
      expect(data.first).toEqual('Martin')
      return  // ignored
    },
  ]
  const afterFindAsync = [
    async (data) => {
      return // ignored
    },
    async (data) => {
      bookCount++
      if (data.bookNumber) data.bookNumber += (1 + bookCount)
      else data.first = 'Martin2'
    },
    async (data) => {
      if (data.bookNumber) {
        expect(data).toEqual({ _id: expect.any(Object), bookNumber: 11 + bookCount })
        return { _id: 1, bookNumber: 11 + bookCount }
      } else {
        expect(data).toEqual({ _id: expect.any(Object), first: 'Martin2', books: data.books })
        return { _id: 2, books: data.books }
      }
    },
    async (data) => {
      if (data._id == 1) expect(data).toEqual({ _id: 1, bookNumber: 11 + bookCount })
      else expect(data).toEqual({ _id: 2, books: data.books })
      return  // ignored
    },
  ]
  const afterFindCallback = [
    (data, next) => {
      next() // ignored
    },
    (data, next) => {
      bookCount++
      if (data.bookNumber) data.bookNumber += (1 + bookCount)
      else data.first = 'Martin2'
      next()
    },
    (data, next) => {
      if (data.bookNumber) {
        expect(data).toEqual({ _id: expect.any(Object), bookNumber: 11 + bookCount })
        next(null, { _id: 1, bookNumber: 11 + bookCount })
      } else {
        expect(data).toEqual({ _id: expect.any(Object), first: 'Martin2', books: data.books })
        next(null, { _id: 2, books: data.books })
      }
    },
    (data, next) => {
      if (data._id == 1) expect(data).toEqual({ _id: 1, bookNumber: 11 + bookCount })
      else expect(data).toEqual({ _id: 2, books: data.books })
      next()  // ignored
    },
  ]

  // Async
  db.model('book', {
    fields: { bookNumber: { type: 'number'} },
    afterFind: afterFindAsync,
  })
  db.model('user', {
    fields: { first: { type: 'string'}, books: [{ model: 'book' }] },
    afterInsert: afterInsertAsync,
    afterFind: afterFindAsync,
  })
  let bookDoc = await db.book.insert({ data: { bookNumber: 10 }})
  let bookDoc2 = await db.book.insert({ data: { bookNumber: 10 }})
  let userDoc = await db.user.insert({ data: { first: 'Martin0', books: [bookDoc._id, bookDoc2._id]}})

  // AfterInsert async
  expect(userDoc).toEqual({
    _id: expect.any(Object),
    first: 'Martin',
    books: [bookDoc._id, bookDoc2._id],
  })

  // AfterFind async
  await expect(db.user.find({ query: userDoc._id, populate: ['books'] })).resolves.toEqual({ 
    _id: 2,
    books: [
      { _id: 1, bookNumber: 12 },
      { _id: 1, bookNumber: 13 },
    ],
  })

  // AfterFind callback/next
  db.model('book', {
    fields: { bookNumber: { type: 'number'} },
    afterFind: afterFindCallback,
  })
  db.model('user', {
    fields: { first: { type: 'string'}, books: [{ model: 'book' }] },
    afterFind: afterFindCallback,
  })
  await expect(db.user.find({ query: userDoc._id, populate: ['books'] })).resolves.toEqual({ 
    _id: 2,
    books: [
      { _id: 1, bookNumber: 15 },
      { _id: 1, bookNumber: 16 },
    ],
  })

})

test('hooks > async', async () => {
  let user = db.model('user', {
    fields: {
      first: { type: 'string'},
    },
    afterFind: [
      async (data) => {
        return new Promise((resolve, reject) => {
          if (data.first === 'Martin1') {
            setTimeout(() => {
              data.first = 'Martin1 delayed'
              resolve(data)
            }, 100)
          } else {
            resolve(data)
          }
        })
      },
      async (data) => {
        return new Promise((resolve, reject) => {
          if (data.first === 'Martin2') {
            setTimeout(() => {
              data.first = 'Martin2 delayed'
              resolve(data)
            }, 100)
          } else {
            resolve(data)
          }
        })
      },
      async (data) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (data.first === 'Martin3') {
              reject(new Error('An async error occurred with Martin3'))
            } else {
              resolve(data)
            }
          }, 100)
        })
      },
      async (data, next) => { // next is ignored, no error
        return new Promise((resolve, reject) => {
          data.last = 'Luther'
          resolve(data)
        })
      },
      (data, next) => { // normal next() callbacks can be mixed with async
        setTimeout(() => {
          data.age = 32
          next()
        }, 100)
      }, 
    ],
  })
  let user1Doc = await user.insert({ 
    data: { first: 'Martin1' },
  })
  let user2Doc = await user.insert({ 
    data: { first: 'Martin2' },
  })
  let user3Doc = await user.insert({ 
    data: { first: 'Martin3' },
  })

  // First async hook is delayed
  await expect(user.find({ query: user1Doc._id })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin1 delayed',
    last: 'Luther',
    age: 32,
  })
  // Second async hook is delayed
  await expect(user.find({ query: user2Doc._id })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin2 delayed',
    last: 'Luther',
    age: 32,
  })
  // Third async hook throws an error
  await expect(user.find({ query: user3Doc._id }))
    .rejects.toThrow('An async error occurred with Martin3')
})

test('hooks > async and next conflict', async () => {
  const db2 = monastery('127.0.0.1/monastery', { timestamps: false })
  let user1 = db2.model('user', {
    fields: { age: { type: 'number'} },
    afterFind: [
      async (data, next) => {
        const promise = await new Promise((resolve, reject) => {
          if (data.age === 0) {
            setTimeout(() => {
              data.age = data.age + 1
              resolve(data)
            }, 100)
          } else {
            resolve(data)
          }
        })
        next() // should console an error after waiting for the promise to finish
        return promise
      },
      async (data, next) => {
        data.age = data.age + 1
      },
    ],
  })
  let user2 = db2.model('user2', {
    fields: { age: { type: 'number'} },
    afterFind: [
      async (data, next) => {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            data.age = data.age + 1
            resolve(data)
          }, 100)
        })
        next() // should console an error after waiting for the promise to finish, without returning a promise
      },
      async (data, next) => {
        data.age = data.age + 1
      },
    ],
  })
  let user3 = db2.model('user3', {
    fields: { age: { type: 'number'} },
    afterFind: [
      async (data, next) => {
        data.age = data.age + 1
        next() // should console an error for empty promise
      },
      async (data, next) => {
        data.age = data.age + 1
      },
    ],
  })
  let user4 = db2.model('user4', {
    fields: { age: { type: 'number'} },
    afterFind: [
      async (data, next) => {
        return await new Promise((resolve, reject) => {
          setTimeout(() => {
            data.age = data.age + 1
            next() // should console an error
            resolve(data)
          }, 100)
        })
      },
      async (data, next) => {
        data.age = data.age + 1
      },
    ],
  })

  let user5 = db2.model('user5', {
    fields: { age: { type: 'number'} },
    afterFind: [
      async (data, next) => {
        const promise = Promise.reject(new Error('An async error occurred with Martin3'))
        next(new Error('An async error occurred with Martin3'))
        return promise
      },
      async (data, next) => {
        data.age = data.age + 1 // shouldn't be reached
      },
    ],
  })


  let user1Doc = await user1.insert({ data: { age: 0 } })
  let user2Doc = await user2.insert({ data: { age: 0 } })
  let user3Doc = await user3.insert({ data: { age: 0 } })
  let user4Doc = await user4.insert({ data: { age: 0 } })
  let user5Doc = await user5.insert({ data: { age: 0 } })

  const logSpy = jest.spyOn(db2, 'error').mockImplementation(() => {})

  // Only increment twice
  await expect(user1.find({ query: user1Doc._id })).resolves.toEqual({ _id: expect.any(Object), age: 2 })
  expect(logSpy).toHaveBeenCalledWith('Monastery user.afterFind error: you cannot return a promise AND call next()')

  await expect(user2.find({ query: user2Doc._id })).resolves.toEqual({ _id: expect.any(Object), age: 2 })
  expect(logSpy).toHaveBeenCalledWith('Monastery user.afterFind error: you cannot return a promise AND call next()')

  await expect(user3.find({ query: user3Doc._id })).resolves.toEqual({ _id: expect.any(Object), age: 2 })
  expect(logSpy).toHaveBeenCalledWith('Monastery user.afterFind error: you cannot return a promise AND call next()')

  await expect(user4.find({ query: user4Doc._id })).resolves.toEqual({ _id: expect.any(Object), age: 2 })
  expect(logSpy).toHaveBeenCalledWith('Monastery user.afterFind error: you cannot return a promise AND call next()')

  await expect(user5.find({ query: user5Doc._id })).rejects.toThrow('An async error occurred with Martin3')
  expect(logSpy).toHaveBeenCalledWith('Monastery user.afterFind error: you cannot return a promise AND call next()')

  db2.close()
})