module.exports = function(monastery, db) {

  test('Testing CRUD actions', async (done) => {
    let db2 = monastery('localhost/monastery')
    let user = db2.model('user', { fields: { name: { type: 'string' }}})

    // Insert test
    let inserted = await user.insert({ data: { name: 'Ip Man' }})
    expect(inserted).toMatchObject({ name: 'Ip Man' })

    // Find test
    let find = await user.find({ query: inserted._id })
    expect(find).toEqual([{ name: 'Ip Man', _id: inserted._id }])

    // FindOne test
    let findOne = await user.findOne({ query: inserted._id })
    expect(findOne).toEqual({ name: 'Ip Man', _id: inserted._id })

    // Update test
    let update = await user.update({ query: inserted._id, data: { name: 'Ip Man2' }})
    expect(update).toEqual({ name: 'Ip Man2' })

    // Remove test
    let remove = await user.remove({ query: inserted._id })
    expect(remove.result).toEqual({ n: 1, ok: 1 })

    db2.close()
    done()
  })

}
