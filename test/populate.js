module.exports = function(monastery, db) {

  test('Model populate', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', { 
      defaultFields: false, 
      serverSelectionTimeoutMS: 2000
    })
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
    let user2 = await user.insert({ data: {
      name: 'Martin Luther2',
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

    // Populate mulitple documents
    let find3 = await user.find({
      query: { _id: { $in: [user1._id, user2._id] }},
      populate: ['myBird']
    })

    expect(find3).toEqual([{
      _id: user1._id,
      name: 'Martin Luther',
      myBird: {
        _id: bird1._id,
        name: "ponyo"
      },
      pets: {
        myBird: bird1._id
      }
    },{
      _id: user2._id,
      name: 'Martin Luther2',
      myBird: {
        _id: bird1._id,
        name: "ponyo"
      },
      pets: {
        myBird: bird1._id
      }
    }])

    db.close()
    done()
  })

  test('Model populate/blacklisting via $lookup', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', {
      defaultFields: false, 
      serverSelectionTimeoutMS: 2000
    })
    let user = db.model('user', {
      fields: {
        birds: [{ model: 'bird' }],
        anyModel: [{ type: 'any' }]
      },
      findBL: [
        'birds.name',
        'anyModel.name'
      ]
    })
    let bird = db.model('bird', { 
      fields: { 
        name: { type: 'string' },
        color: { type: 'string' },
        owner: { model: 'user' }
      },
      findBL: [
        'color'
      ]
    })

    let user1 = await user.insert({ data: {} })
    let id = user1._id.toString()
    let bird1 = await bird.insert({ data: { color: 'red', name: 'ponyo', owner: id, anyModel: id }})
    let bird2 = await bird.insert({ data: { color: 'blue', name: 'carla', owner: id, anyModel: id }})

    // Multiple $lookup 
    let find1 = await user.findOne({ 
      query: user1._id,
      populate: [{
        "as": "birds",
        "from": "bird",
        "let": { id: "$_id" },
        "pipeline": [
          { $match: { $expr: { $eq: ['$owner', '$$id'] }}}
        ]
      }]
    })
    expect(find1).toEqual({
      _id: user1._id,
      birds: [
        {
          _id: bird1._id,
          owner: user1._id
        }, {
          _id: bird2._id,
          owner: user1._id
        }
      ]
    })

    // $lookup on type:any
    let find2 = await user.findOne({
      query: user1._id,
      populate: [{
        "as": "anyModel",
        "from": "bird",
        "let": { id: "$_id" },
        "pipeline": [
          { $match: { $expr: { $eq: ['$owner', '$$id'] }}}
        ]
      }]
    })
    expect(find2).toEqual({
      _id: user1._id,
      anyModel: [
        {
          _id: bird1._id,
          color: 'red',
          name: 'ponyo',
          owner: user1._id
        }, {
          _id: bird2._id,
          color: 'blue',
          name: 'carla',
          owner: user1._id
        }
      ]
    })

    db.close()
    done()
  })

}
