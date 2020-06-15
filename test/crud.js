module.exports = function(monastery, db) {

  test('Basic operator calls', async (done) => {
    let db2 = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
    let user = db2.model('user', { fields: { name: { type: 'string' }}})

    // Insert test
    let inserted = await user.insert({ data: { name: 'Martin Luther' }})
    expect(inserted).toMatchObject({ name: 'Martin Luther' })

    // Find test
    let find = await user.find({ query: inserted._id })
    expect(find).toEqual({ name: 'Martin Luther', _id: inserted._id })

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
    expect(findOne).toEqual({ name: 'Martin Luther', _id: inserted._id })

    // FindOne test (no args)
    let findOne2 = await user.findOne()
    expect(typeof findOne2).toEqual('object')

    // Update test
    let update = await user.update({ query: inserted._id, data: { name: 'Martin Luther2' }})
    expect(update).toEqual({ name: 'Martin Luther2' })

    // Update test (empty data object)
    expect(user.update({ query: inserted._id, data: {}})).rejects
      .toEqual('No valid data passed to user.update()')

    // Update test (no data object)
    expect(user.update({ query: inserted._id })).rejects
      .toEqual('No valid data passed to user.update()')

    // Remove test
    let remove = await user.remove({ query: inserted._id })
    expect(remove.result).toEqual({ n: 1, ok: 1 })

    db2.close()
    done()
  })

  test('Insert defaults', async (done) => {
    let db = monastery('localhost/monastery', { defaults: true, serverSelectionTimeoutMS: 2000 })
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      names: [{ type: 'string' }],
      animals: { 
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }]
      }
    }})

    let inserted = await user.insert({ data: {} })
    expect(inserted).toEqual({ 
      _id: inserted._id,
      names: [],
      animals: { dogs: [] }
    })

    // No data object
    let inserted2 = await user.insert({})
    expect(inserted2).toEqual({ 
      _id: inserted2._id,
      names: [],
      animals: { dogs: [] }
    })

    // No arguments
    let inserted3 = await user.insert()
    expect(inserted3).toEqual({ 
      _id: inserted3._id,
      names: [],
      animals: { dogs: [] }
    })

    db.close()
    done()
  })

}
