let util = require('../lib/util')

module.exports = function(monastery, db) {

  test('Basic operator calls', async (done) => {
    let db = monastery('localhost/monastery', { defaultFields: false, serverSelectionTimeoutMS: 2000 })
    let user = db.model('user', { fields: { name: { type: 'string' }}})

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

    // Find test
    let find = await user.find({ query: inserted._id })
    expect(find).toEqual({
      _id: inserted._id,
      name: 'Martin Luther'
    })

    // Find test2
    let find2 = await user.find({ query: { name: 'Martin Luther' }})
    expect(find2[0]).toMatchObject({ name: 'Martin Luther' })

    // Find test (empty query)
    let find3 = await user.find({ query: {} })
    expect(find3.length).toBeGreaterThan(0)

    // Find test (empty options)
    let find4 = await user.find({})
    expect(find4.length).toBeGreaterThan(0)

    // Find test (no args)
    let find5 = await user.find()
    expect(find5.length).toBeGreaterThan(0)

    // FindOne test
    let findOne = await user.findOne({ query: inserted._id })
    expect(findOne).toEqual({
      _id: inserted._id,
      name: 'Martin Luther'
    })

    // FindOne test (no args)
    let findOne2 = await user.findOne()
    expect(typeof findOne2).toEqual('object')

    // Update test
    let update = await user.update({
      query: inserted._id,
      data: { name: 'Martin Luther2' }
    })
    expect(update).toEqual({
      name: 'Martin Luther2'
    })

    // Update test (empty data object)
    expect(user.update({ query: inserted._id, data: {}})).rejects
      .toEqual('No valid data passed to user.update()')

    // Update test (no data object)
    expect(user.update({ query: inserted._id })).rejects
      .toEqual('No valid data passed to user.update()')

    // Update multiple
    let updated2 = await user.update({
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

    // Remove test
    let remove = await user.remove({ query: inserted._id })
    expect(remove.result).toEqual({ n: 1, ok: 1 })

    db.close()
    done()
  })

  test('Insert defaults', async (done) => {
    let db = monastery('localhost/monastery', {
      // default: defaultFields: true
      defaultObjects: true,
      serverSelectionTimeoutMS: 2000
    })
    let db2 = monastery('localhost/monastery', {
      // default: defaultFields: true,
      useMilliseconds: true,
      serverSelectionTimeoutMS: 2000
    })
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
    done()
  })

  test('Insert with id casting', async (done) => {
    let db = monastery('localhost/monastery', { defaultFields: false })
    let company = db.model('company', { fields: {
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
    done()
  })

  test('Find default field population', async (done) => {
    let db = monastery('localhost/monastery', { defaultFields: false, serverSelectionTimeoutMS: 2000 })
    let user = db.model('user', {
      fields: {
        name: { type: 'string'},
        addresses: [{ city: { type: 'string' }, country: { type: 'string' } }],
        pet:  { dog: { model: 'dog' }},
        dogs: [{ model: 'dog' }], // virtual association

      }
    })
    let dog = db.model('dog', {
      fields: {
        name: { type: 'string' },
        user: { model: 'user' }
      }
    })

    // Insert documents and add
    let inserted = await dog.insert({ data: {} })
    let inserted2 = await user.insert({ data: {
      addresses: [{ city: 'Frankfurt' }, { city: 'Berlin' }],
      pet: { dog: inserted._id }
    }})
    let updated = await dog.update({
      query: inserted._id,
      data: { user: inserted2._id }
    })

    // Update models
    db.model('user', {
      fields: {
        name: { type: 'string', default: 'Martin Luther' },
        addresses: [{ city: { type: 'string' }, country: { type: 'string', default: 'Germany' } }],
        address: { country:  { type: 'string', default: 'Germany' }},
        pet:  { dog: { model: 'dog' }},
        dogs: [{ model: 'dog' }], // virtual association
      }
    })
    db.model('dog', {
      fields: {
        name: { type: 'string', default: 'Scruff' },
        user: { model: 'user' }
      }
    })

    // Default field population test
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
      addresses: [{ city: 'Frankfurt', country: 'Germany' }, { city: 'Berlin', country: 'Germany' }],
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
      addresses: [{ city: 'Frankfurt' }, { city: 'Berlin' }],
      pet: { dog: { _id: inserted._id, name: 'Scruff', user: inserted2._id }},
      dogs: [{ _id: inserted._id, user: inserted2._id }]
    })

    db.close()
    done()
  })

}
