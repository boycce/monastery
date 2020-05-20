module.exports = function(monastery, db) {

  test('Model populate', async (done) => {
    // Setup
    let db = monastery('localhost/monastery')
    let bird = db.model('bird', { 
      fields: { 
        name: { type: 'string' }
      }
    })
    let user = db.model('user', {
      fields: {
        name: { type: 'string' },
        myBird: { model: 'bird' },
        pets: {
          myBird: { model: 'bird' }
        }
      }
    })
    let bird1 = await bird.insert({ data: { name: 'ponyo' }})
    let user1 = await user.insert({ data: {
      name: 'Martin Luther',
      myBird: bird1._id,
      pets: {
        myBird: bird1._id
      }
    }})

    // Basic populate
    let find1 = await user.findOne({ query: user1._id, populate: ['myBird'] })
    expect(find1).toEqual({
      _id: user1._id,
      name: 'Martin Luther',
      myBird: {
        _id: bird1._id,
        name: "ponyo"
      },
      pets: {
        myBird: bird1._id
      }
    })

    // Deep populate
    let find2 = await user.findOne({ query: user1._id, populate: ['pets.myBird'] })
    expect(find2).toEqual({
      _id: user1._id,
      name: 'Martin Luther',
      myBird: bird1._id,
      pets: {
        myBird: {
          _id: bird1._id,
          name: "ponyo"
        },
      }
    })

    db.close()
    done()
  })

}
