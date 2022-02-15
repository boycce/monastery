// let util = require('../lib/util')

module.exports = function(monastery, opendb) {

  test('basic operator calls', async () => {
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string' },
      },
    })

    // Insert one
    let inserted = await user.insert({ data: { name: 'Martin Luther' }})
    expect(inserted).toEqual({
      _id: expect.any(Object),
      name: 'Martin Luther'
    })

    // Insert multiple
    let inserted2 = await user.insert({ data: [{ name: 'Martin Luther1' }, { name: 'Martin Luther2' }]})
    expect(inserted2).toEqual([
      {
        _id: expect.any(Object),
        name: 'Martin Luther1'
      }, {
        _id: expect.any(Object),
        name: 'Martin Luther2'
      }
    ])

    // Find (basic match)
    let find = await user.find({ query: { name: 'Martin Luther' }})
    expect(find[0]).toMatchObject({ name: 'Martin Luther' })

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

    // Missing parameters
    await expect(user.find()).rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find(undefined)).rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find({})).rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find({ query: null })).rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find({ query: undefined })).rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find({ query: { _id: undefined }}))
      .rejects.toThrow('Please pass an object or MongoId to options.query')
    await expect(user.find(1)).rejects.toThrow('Please pass an object or MongoId to options.query')

    // Bad MongoID
    await expect(user.find({ query: '' })).resolves.toEqual(null)
    await expect(user.find('bad-id')).resolves.toEqual(null)
    await expect(user.find('')).resolves.toEqual(null)

    // FindOne (query id)
    let findOne = await user.findOne({ query: inserted._id })
    expect(findOne).toEqual({ _id: inserted._id, name: 'Martin Luther' })

    // Findone (id)
    let findOne2 = await user.findOne(inserted2[0]._id)
    expect(findOne2).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })

    // Findone (id string)
    let findOne3 = await user.findOne(inserted2[0]._id.toString())
    expect(findOne3).toEqual({ _id: inserted2[0]._id, name: 'Martin Luther1' })

    // Remove
    let remove = await user.remove({ query: inserted._id })
    expect(remove.result).toEqual({ n: 1, ok: 1 })

    db.close()
  })

  test('insert defaults', async () => {
    let db = (await opendb(null, { defaultObjects: true, serverSelectionTimeoutMS: 2000 })).db
    let db2 = (await opendb(null, { useMilliseconds: true, serverSelectionTimeoutMS: 2000 })).db
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      names: [{ type: 'string' }],
      animals: {
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }]
      },
    }})
    let user2 = db2.model('user2', { fields: {}})

    let inserted = await user.insert({ data: {} })
    expect(inserted).toEqual({
      _id: inserted._id,
      names: [],
      animals: { dogs: [] },
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number)
    })

    // No data object
    let inserted2 = await user.insert({})
    expect(inserted2).toEqual({
      _id: inserted2._id,
      names: [],
      animals: { dogs: [] },
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number)
    })

    // No arguments
    let inserted3 = await user.insert()
    expect(inserted3).toEqual({
      _id: inserted3._id,
      names: [],
      animals: { dogs: [] },
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number)
    })

    // Milliseconds
    let inserted4 = await user2.insert()
    expect(inserted4).toEqual({
      _id: inserted4._id,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number)
    })

    db.close()
    db2.close()
  })

  test('update basics', async () => {
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string' },
      },
    })

    // Insert
    let inserted = await user.insert({ data: { name: 'Martin Luther' }})
    expect(inserted).toEqual({
      _id: expect.any(Object),
      name: 'Martin Luther'
    })

    // Insert multiple
    let inserted2 = await user.insert({ data: [{ name: 'Martin Luther1' }, { name: 'Martin Luther2' }]})
    expect(inserted2).toEqual([
      {
        _id: expect.any(Object),
        name: 'Martin Luther1'
      }, {
        _id: expect.any(Object),
        name: 'Martin Luther2'
      }
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
      multi: true
    })
    let findUpdated2 = await user.find({
      query: { _id: { $in: [inserted2[0]._id, inserted2[1]._id] }}
    })
    expect(findUpdated2).toEqual([
      {
        _id: expect.any(Object),
        name: 'Martin Luther3'
      }, {
        _id: expect.any(Object),
        name: 'Martin Luther3'
      }
    ])
    db.close()
  })

  test('update defaults', async () => {
    let db = (await opendb(null, { useMilliseconds: true, serverSelectionTimeoutMS: 2000 })).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string' }
      }
    })
    let inserted = await user.insert({
      data: {}
    })
    expect(inserted).toEqual({
      _id: inserted._id,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number)
    })

    // Default field
    let updated = await user.update({
      query: inserted._id,
      data: { name: 'Bruce' }
    })
    expect(updated).toEqual({
      name: 'Bruce',
      updatedAt: expect.any(Number)
    })
    expect(updated.updatedAt && updated.updatedAt != inserted.updatedAt).toEqual(true)

    // Empty data (still contains updatedAt)
    let updated2 = await user.update({
      query: inserted._id,
      data: {}
    })
    expect(updated2).toEqual({
      updatedAt: expect.any(Number)
    })

    // Empty data (with no timestamps)
    await expect(user.update({
      query: inserted._id,
      data: {},
      timestamps: false
    })).rejects.toThrow('No valid data passed to user.update({ data: .. })')

    // UpdatedAt override (wont work)
    let updated4 = await user.update({
      query: inserted._id,
      data: { updatedAt: 1 }
    })
    expect(updated4.updatedAt > 1).toEqual(true)

    // UpdatedAt override
    let updated5 = await user.update({
      query: inserted._id,
      data: { updatedAt: 1 },
      timestamps: false
    })
    expect(updated5.updatedAt).toEqual(1)

    db.close()
  })

  test('update operators', async () => {
    let db = (await opendb(null)).db
    let user = db.model('userOperators', {
      fields: {
        name: { type: 'string', minLength: 5 },
        age: { type: 'number' },
      },
      beforeValidate: [(data, next) => { beforeValidateHookCalled = true; next() }]
    })

    let inserted = await user.insert({
      data: { name: 'Bruce', age: 12 }
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

    db.close()
  })

  test('insert with id casting', async () => {
    let db = (await opendb(null)).db
    db.model('company', { fields: {
      name: { type: 'string' }
    }})
    let user = db.model('user', { fields: {
      randomId: { type: 'id' },
      company: { model: 'company' },
      companies: [{ model: 'company' }]
    }})

    let id = '5edf17ff7e2d5020913f98cc'
    let inserted = await user.insert({ data: { randomId: id, company: id, companies: [id] } })

    expect(inserted).toEqual({
      _id: inserted._id,
      randomId: db.id(id),
      company: db.id(id),
      companies: [db.id(id)]
    })

    db.close()
  })

  test('find default field population', async () => {
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string', default: 'Martin Luther' },
        addresses: [{ city: { type: 'string' }, country: { type: 'string', default: 'Germany' } }],
        address: { country:  { type: 'string', default: 'Germany' }},
        pet:  { dog: { model: 'dog' }},
        dogs: [{ model: 'dog' }], // virtual association
      }
    })
    let dog = db.model('dog', {
      fields: {
        name: { type: 'string', default: 'Scruff' },
        user: { model: 'user' }
      }
    })

    // Default field doesn't override null
    let nulldoc1 = await dog.insert({ data: { name: null }})
    let nullfind1 = await dog.findOne({ query: nulldoc1._id })
    expect(nullfind1).toEqual({ _id: nulldoc1._id, name: null })

    // Default field doesn't override empty string
    let nulldoc2 = await dog.insert({ data: { name: '' }})
    let nullfind2 = await dog.findOne({ query: nulldoc2._id })
    expect(nullfind2).toEqual({ _id: nulldoc2._id, name: '' })

    // Default field overrides undefined
    let nulldoc3 = await dog.insert({ data: { name: undefined }})
    let nullfind3 = await dog.findOne({ query: nulldoc3._id })
    expect(nullfind3).toEqual({ _id: nullfind3._id, name: 'Scruff' })

    // Default field population test
    // Note that addresses.1.country shouldn't be overriden
    // Insert documents (without defaults)
    let inserted = await dog._insert({})
    let inserted2 = await user._insert({
      addresses: [
        { city: 'Frankfurt' },
        { city: 'Christchurch', country: 'New Zealand' }
      ],
      pet: { dog: inserted._id }
    })
    await dog._update(inserted._id, { $set: { user: inserted2._id }})

    let find1 = await user.findOne({
      query: inserted2._id,
      populate: ['pet.dog', {
        from: 'dog',
        localField: '_id',
        foreignField: 'user',
        as: 'dogs'
      }]
    })
    expect(find1).toEqual({
      _id: inserted2._id,
      name: 'Martin Luther',
      addresses: [{ city: 'Frankfurt', country: 'Germany' }, { city: 'Christchurch', country: 'New Zealand' }],
      address: { country: 'Germany' },
      pet: { dog: { _id: inserted._id, name: 'Scruff', user: inserted2._id }},
      dogs: [{ _id: inserted._id, name: 'Scruff', user: inserted2._id }]
    })

    // Blacklisted default field population test
    let find2 = await user.findOne({
      query: inserted2._id,
      populate: ['pet.dog', {
        from: 'dog',
        localField: '_id',
        foreignField: 'user',
        as: 'dogs'
      }],
      blacklist: ['address', 'addresses.country', 'dogs.name']
    })
    expect(find2).toEqual({
      _id: inserted2._id,
      name: 'Martin Luther',
      addresses: [{ city: 'Frankfurt' }, { city: 'Christchurch' }],
      pet: { dog: { _id: inserted._id, name: 'Scruff', user: inserted2._id }},
      dogs: [{ _id: inserted._id, user: inserted2._id }]
    })

    db.close()
  })

  test('hooks', async () => {
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        first: { type: 'string'},
        last: { type: 'string'}
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
      last: 'Luther'
    })

    // Catch update (a)synchronous errors thrown in function or through `next(err)`
    await expect(user.update({ query: userDoc._id, data: { first: '' } }))
      .rejects.toThrow('beforeUpdate error 1..')
    await expect(user.update({ query: userDoc._id, data: { first: 'Martin' } }))
      .rejects.toThrow('beforeUpdate error 2..')
    await expect(user.update({ query: userDoc._id, data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
      first: 'Martin',
      last: 'Luther'
    })

    // Catch remove synchronous errors through `next(err)`
    await expect(user.remove({ query: userDoc._id })).rejects.toThrow('beforeRemove error..')

    // After find continues series
    await expect(user.find({ query: userDoc._id })).resolves.toEqual({
      _id: expect.any(Object),
      first: 'Martin',
      last: 'Luther'
    })

    db.close()
  })

}
