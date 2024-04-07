module.exports = function(monastery, opendb) {

  test('model populate', async () => {
    // Setup
    let db = (await opendb(null)).db
    let bird = db.model('bird', { fields: {
      name: { type: 'string' }
    }})
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      myBird: { model: 'bird' },
      pets: { myBird: { model: 'bird' } }
    }})
    let bird1 = await bird.insert({ data: { name: 'ponyo' }})
    let user1 = await user.insert({ data: {
      name: 'Martin Luther',
      myBird: bird1._id,
      pets: { myBird: bird1._id }
    }})
    let user2 = await user.insert({ data: {
      name: 'Martin Luther2',
      myBird: bird1._id,
      pets: { myBird: bird1._id }
    }})

    // Basic populate
    let find1 = await user.findOne({ query: user1._id, populate: ['myBird'] })
    expect(find1).toEqual({
      _id: user1._id,
      name: 'Martin Luther',
      myBird: {
        _id: bird1._id,
        name: 'ponyo'
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
          name: 'ponyo'
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
        name: 'ponyo'
      },
      pets: {
        myBird: bird1._id
      }
    },{
      _id: user2._id,
      name: 'Martin Luther2',
      myBird: {
        _id: bird1._id,
        name: 'ponyo'
      },
      pets: {
        myBird: bird1._id
      }
    }])

    db.close()
  })

  test('model populate array', async () => {
    // Setup
    let db = (await opendb(null)).db
    let bird = db.model('bird', { fields: {
      name: { type: 'string' }
    }})
    let user = db.model('user', { fields: {
      birds: [{ model: 'bird' }],
      animal: { birds: [{ model: 'bird' }] },
      animals: [{ bird: { model: 'bird' }, num: { type: 'number' } }],
    }})
    let bird1 = await bird.insert({ data: { name: 'ponyo' }})
    let bird2 = await bird.insert({ data: { name: 'jack' }})
    let bird3 = await bird.insert({ data: { name: 'sophie' }})
    let user1 = await user.insert({ data: {
      birds: [bird1._id, bird2._id],
      animal: { birds: [bird1._id, bird2._id] },
      animals: [{ bird: bird1._id, num: 1 }, { bird: bird3._id, num: 2 }],
    }})

    // Array
    let find1 = await user.findOne({ query: user1._id, populate: ['birds'] })
    expect(find1).toEqual({
      _id: user1._id,
      birds: [
        { _id: bird1._id, name: 'ponyo' },
        { _id: bird2._id, name: 'jack' },
      ],
      animal: {
        birds: [bird1._id, bird2._id],
      },
      animals: [
        { bird: bird1._id, num: 1 },
        { bird: bird3._id, num: 2 },
      ],
    })

    // Nested array
    let find2 = await user.findOne({ query: user1._id, populate: ['animal.birds'] })
    expect(find2).toEqual({
      _id: user1._id,
      birds: [bird1._id, bird2._id],
      animal: {
        birds: [
          { _id: bird1._id, name: 'ponyo' },
          { _id: bird2._id, name: 'jack' },
        ],
      },
      animals: [
        { bird: bird1._id, num: 1 },
        { bird: bird3._id, num: 2 },
      ],
    })

    // modelId within an array of subdocuments (won't populate, but show a debug error)
    user.error = (e) => {/*console.log(e)*/} // hide debug error
    let find3 = await user.findOne({ query: user1._id, populate: ['animals.bird'] })
    expect(find3).toEqual({
      _id: user1._id,
      birds: [bird1._id, bird2._id],
      animal: {
        birds: [
          bird1._id, 
          bird2._id
        ],
      },
      animals: [
        { bird: bird1._id, num: 1 },
        { bird: bird3._id, num: 2 },
      ],
    })

    db.close()
  })

  test('model populate type=any', async () => {
    let db = (await opendb(null)).db
    db.model('company', { fields: {
      address: { type: 'any' }
    }})
    db.model('user', {
      fields: {
        company: { model: 'company' },
        cards: { type: 'any' },
        cards2: {
          white: { type: 'number' },
          yellow:  { type: 'number' }
        },
        cards3: {
          white: { type: 'number' },
        }
      },
      findBL: ['cards2.white', 'cards3.white']
    })
    let company = await db.company.insert({ data: {
      address: {
        number: 1234,
        city: 'Auckland'
      }
    }})
    let user = await db.user.insert({ data: {
      company: company._id,
      cards: { black: 1234 },
      cards2: { white: 1234, yellow: 1234 },
      cards3: { white: 1234 }
    }})

    let foundUser = await db.user.find({ query: user._id, populate: ['company'] })
    expect(foundUser).toEqual({
      _id: user._id,
      company: {
        _id: company._id,
        address: {
          number: 1234,
          city: 'Auckland'
        }
      },
      cards: { black: 1234 },
      cards2: { yellow: 1234 },
      cards3: {}
    })

    db.close()
  })

  test('model populate or blacklisting via $lookup', async () => {
    // Setup
    let db = (await opendb(null)).db
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
        'as': 'birds',
        'from': 'bird',
        'let': { id: '$_id' },
        'pipeline': [
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
        'as': 'anyModel',
        'from': 'bird',
        'let': { id: '$_id' },
        'pipeline': [
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
          owner: user1._id
        }, {
          _id: bird2._id,
          color: 'blue',
          owner: user1._id
        }
      ]
    })

    db.close()
  })

}
