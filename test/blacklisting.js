module.exports = function(monastery, opendb) {

  test('find blacklisting basic', async () => {
    // Setup
    let db = (await opendb(null)).db
    let bird = db.model('bird', {
      fields: {
        name: { type: 'string' },
      }
    })
    let user = db.model('user', {
      fields: {
        list: [{ type: 'number' }],
        dog: { type: 'string' },
        pet: { type: 'string' },
        pets: [{
          name: { type: 'string'},
          age: { type: 'number'}
        }],
        animals: {
          cat: { type: 'string' },
          dog: { type: 'string' }
        },
        hiddenPets: [{
          name: { type: 'string'}
        }],
        hiddenList: [{ type: 'number'}],
        deep: {
          deep2: {
            deep3: {
              deep4: { type: 'string' }
            }
          }
        },
        deeper: {
          deeper2: {
            deeper3: {
              deeper4: { type: 'string' }
            }
          }
        },
        deepModel: {
          myBird: { model: 'bird' }
        },
        hiddenDeepModel: {
          myBird: { model: 'bird' }
        }
      },
      findBL: [
        'dog',
        'animals.cat',
        'pets.age',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.deep3',
        'deeper',
        'hiddenDeepModel'
      ],
    })
    let bird1 = await bird.insert({ data: { name: 'ponyo' }})
    let user1 = await user.insert({ data: {
      list: [44, 54],
      dog: 'Bruce',
      pet: 'Freddy',
      pets: [{ name: 'Pluto', age: 5 }, { name: 'Milo', age: 4 }],
      animals: {
        cat: 'Ginger',
        dog: 'Max'
      },
      hiddenPets: [{
        name: 'secretPet'
      }],
      hiddenList: [12, 23],
      deep: {
        deep2: {
          deep3: {
            deep4: 'hideme'
          }
        }
      },
      deeper: {
        deeper2: {
          deeper3: {
            deeper4: 'hideme'
          }
        }
      },
      deepModel: {
        myBird: bird1._id
      },
      hiddenDeepModel: {
        myBird: bird1._id
      }
    }})

    // Test initial blacklist
    let find1 = await user.findOne({
      query: user1._id
    })
    expect(find1).toEqual({
      _id: user1._id,
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max' },
      deep: { deep2: {} },
      deepModel: { myBird: bird1._id }
    })
    /*
    // Test augmented blacklist
    let find2 = await user.findOne({
      query: user1._id,
      blacklist: ['pet', 'pet', 'deep', 'deepModel', '-dog', '-animals.cat']
    })
    expect(find2).toEqual({
      _id: user1._id,
      dog: 'Bruce',
      list: [44, 54],
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max', cat: 'Ginger' }
    })
    */

    db.close()
  })

  test('find blacklisting population', async () => {
    // inprogresss
    // Setup
    let db = monastery('localhost/monastery', {
      timestamps: false,
      serverSelectionTimeoutMS: 2000,
    })
    let bird = db.model('bird', {
      fields: {
        color: { type: 'string', default: 'red' },
        height: { type: 'number' },
        name: { type: 'string' },
        sub: {
          color: { type: 'string', default: 'red' },
        },
        subs: [{
          color: { type: 'string', default: 'red'},
        }],
        wing: {
          size: { type: 'number' },
          sizes: {
            one: { type: 'number' },
            two: { type: 'number' },
          }
        },
      },
      findBL: ['wing']
    })
    let user = db.model('user', {
      fields: {
        dog: { type: 'string' },
        bird1: { model: 'bird' },
        bird2: { model: 'bird' },
        bird3: { model: 'bird' },
        bird4: { model: 'bird' },
        bird5: { model: 'bird' },
      },
      findBL: [
        'bird1.name',                                 // bird1.name & bird1.wing blacklisted
        '-bird2', 'bird2.name',                       // bird2.name blacklisted
        'bird3.name', '-bird3', 'bird3.height',       // bird3.height blacklisted
        '-bird4.wing.sizes.one', '-bird4.wing.size',  // ignored
        // bird4.wing.sizes.two blacklisted (expand in future verion)
        '-bird5.wing.sizes.one',                      // bird5.wing.sizes.one ignored, wing blacklisted
        // bird5.wing.sizes.two, wing.size blacklisted (expand in future verion)
      ]
    })
    let bird1 = await bird.insert({
      data: {
        name: 'ponyo',
        height: 40,
        sub: {},
        wing: { size: 1, sizes: { one: 1, two: 1 }}
      }
    })
    let userData = {
      dog: 'Bruce',
      bird1: bird1._id,
      bird2: bird1._id,
      bird3: bird1._id,
      bird4: bird1._id,
      bird5: bird1._id
    }
    let user1 = await user.insert({ data: userData })
    let bird1Base = { _id: bird1._id, color: 'red', sub: { color: 'red' }}

    // Test bird1
    expect(await user.findOne({ query: user1._id, populate: ['bird1'] })).toEqual({
      ...userData,
      _id: user1._id,
      bird1: { ...bird1Base, height: 40 },
    })
    // Test bird2
    expect(await user.findOne({ query: user1._id, populate: ['bird2'] })).toEqual({
      ...userData,
      _id: user1._id,
      bird2: { ...bird1Base, height: 40, wing: { size: 1, sizes: { one: 1, two: 1 }} },
    })
    // Test bird3
    expect(await user.findOne({ query: user1._id, populate: ['bird3'] })).toEqual({
      ...userData,
      _id: user1._id,
      bird3: { ...bird1Base, name: 'ponyo', wing: { size: 1, sizes: { one: 1, two: 1 }} },
    })
    // Test bird4
    expect(await user.findOne({ query: user1._id, populate: ['bird4'] })).toEqual({
      ...userData,
      _id: user1._id,
      bird4: { ...bird1Base, name: 'ponyo', height: 40 },
    })
    // Test bird5
    expect(await user.findOne({ query: user1._id, populate: ['bird5'] })).toEqual({
      ...userData,
      _id: user1._id,
      bird5: { ...bird1Base, name: 'ponyo', height: 40 },
    })

    db.close()
  })

  test('find blacklisting getProjection', async () => {
    let db = (await opendb(null)).db
    // Setup
    db.model('bird', {
      fields: {
        age: { type: 'number' },
        name: { type: 'string' },
        wing: {
          size: { type: 'number' },
        },
      },
      findBL: ['age', 'wing']
    })
    db.model('user', {
      fields: {
        name: { type: 'string' },
        bird1: { model: 'bird' },
      },
    })
    // default
    expect(db.user._getProjectionFromBlacklist('find')).toEqual({
      'bird1.wing': 0,
      'bird1.age': 0,
      'password': 0,
    })
    // blacklist /w invalid field (which goes through)
    expect(db.user._getProjectionFromBlacklist('find', ['name', 'invalidfield'])).toEqual({
      'bird1.wing': 0,
      'bird1.age': 0,
      'invalidfield': 0,
      'name': 0,
      'password': 0,
    })
    // whitelist
    expect(db.user._getProjectionFromBlacklist('find', ['-password', '-bird1.age'])).toEqual({
      'bird1.wing': 0,
    })
    // whitelist parent
    expect(db.user._getProjectionFromBlacklist('find', ['-bird1'])).toEqual({
      'password': 0,
    })
    // whitelist parent, then blacklist child
    expect(db.user._getProjectionFromBlacklist('find', ['-bird1', 'bird1.name'])).toEqual({
      'password': 0,
      'bird1.name': 0,
    })
    // the model's blacklists are applied after deep model's
    db.user.findBL = ['-bird1.age']
    expect(db.user._getProjectionFromBlacklist('find')).toEqual({
      'bird1.wing': 0,
    })
    // custom blacklists are applied after the model's, which are after deep model's
    db.user.findBL = ['-bird1.age']
    expect(db.user._getProjectionFromBlacklist('find', ['bird1'])).toEqual({
      'bird1': 0,
    })
    // blacklisted parent with a blacklisted child
    expect(db.user._getProjectionFromBlacklist('find', ['bird1', 'bird1.wing'])).toEqual({
      'bird1': 0,
    })
    // A mess of things
    expect(db.user._getProjectionFromBlacklist('find', ['-bird1', 'bird1.wing', '-bird1.wing','bird1.wing.size'])).toEqual({
      'bird1.wing.size': 0,
    })
    // blacklisted parent with a whitelisted child (expect blacklist expansion in future version?)
    // expect(db.user._getProjectionFromBlacklist('find', ['bird1', '-bird1.wing'])).toEqual({
    //   'bird1.age': 0,
    //   'bird1.name': 0,
    // })

    db.close()
  })

  test('find project basic', async () => {
    // Test mongodb native project option
    // Setup
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string' },
        color: { type: 'string', default: 'red' },
        animal: {
          name: { type: 'string' },
          color: { type: 'string', default: 'red' },
        },
        animals: [{
          name: { type: 'string' },
          color: { type: 'string', default: 'red' }
        }]
      }
    })
    let user1 = await user.insert({ data: {
      name: 'Bruce',
      animal: {
        name: 'max'
      },
      animals: [
        { name: 'ponyo' },
        { name: 'freddy' }
      ]
    }})

    // Test inclusion projections
    let find1 = await user.findOne({
      query: user1._id,
      project: ['animal.name', 'animals.name']
    })
    expect(find1).toEqual({
      _id: user1._id,
      animal: { name: 'max' },
      animals: [
        { name: 'ponyo' },
        { name: 'freddy' }
      ]
    })

    // Test exclusion projections
    let find2 = await user.findOne({
      query: user1._id,
      project: ['-animal.name', '-animals.color', '-name', '-color']
    })
    expect(find2).toEqual({
      _id: user1._id,
      animal: { color: 'red' },
      animals: [
        { name: 'ponyo' },
        { name: 'freddy' }
      ]
    })

    db.close()
  })

  test('find project population', async () => {
    // Test mongodb native project option
    // Setup
    let db = (await opendb(null)).db
    let bird = db.model('bird', {
      fields: {
        name: { type: 'string' },
        age: { type: 'number' },
        height: { type: 'number' },
        color: { type: 'string', default: 'red' },
        sub: {
          color: { type: 'string', default: 'red' },
        }
      },
      findBL: ['age']
    })
    let user = db.model('user', {
      fields: {
        dog: { type: 'string' },
        bird: { model: 'bird' },
        bird2: { model: 'bird' },
        bird3: { model: 'bird' }
      },
      findBL: [
        // allll these should be ignored.....?/////
        'bird.name',                             // bird.name & bird.age blacklisted
        '-bird2', 'bird2.name',                  // bird2.name blacklisted
        'bird3.name', '-bird3', 'bird3.height',  // bird3.height blacklisted
      ]
    })
    let bird1 = await bird.insert({ data: {
      name: 'ponyo',
      age: 3,
      height: 40,
      sub: {}
    }})
    let user1 = await user.insert({ data: {
      dog: 'Bruce',
      bird: bird1._id,
      bird2: bird1._id,
      bird3: bird1._id
    }})

    // Test project
    let find1 = await user.findOne({
      query: user1._id,
      populate: ['bird', 'bird2'],
      project: ['bird.age', 'bird2']
    })
    expect(find1).toEqual({
      _id: user1._id,
      bird: { age: 3 },
      bird2: { _id: bird1._id, age: 3, name: 'ponyo', height: 40, color: 'red', sub: { color: 'red' }}
    })

    // Test project (different project details)
    let find2 = await user.findOne({
      query: user1._id,
      populate: ['bird', 'bird2'],
      project: ['bird', 'bird2.height']
    })
    expect(find2).toEqual({
      _id: user1._id,
      bird: { _id: bird1._id, age: 3, name: 'ponyo', height: 40, color: 'red', sub: { color: 'red' }},
      bird2: { height: 40 },
    })

    db.close()
  })

  test('insert update blacklisting (validate)', async () => {
    // Setup
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        list: [{ type: 'number' }],
        dog: { type: 'string' },
        pet: { type: 'string' },
        pets: [{ name: { type: 'string'}, age: { type: 'number'} }],
        animals: {
          cat: { type: 'string' },
          dog: { type: 'string' }
        },
        hiddenPets: [{
          name: { type: 'string'}
        }],
        hiddenList: [{ type: 'number'}],
        deep: {
          deep2: {
            deep3: {
              deep4: { type: 'string' }
            }
          }
        }
      },
      insertBL: [
        'dog',
        'animals.cat',
        'pets.age',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.deep3'
      ]
    })
    let doc1 = {
      list: [44, 54],
      dog: 'Bruce',
      pet: 'Freddy',
      pets: [{ name: 'Pluto', age: 5 }, { name: 'Milo', age: 4 }],
      animals: {
        cat: 'Ginger',
        dog: 'Max'
      },
      hiddenPets: [{
        name: 'secretPet'
      }],
      hiddenList: [12, 23],
      deep: {
        deep2: {
          deep3: {
            deep4: 'hideme'
          }
        }
      }
    }

    // Default insert validation
    let user1 = await user.validate(doc1)
    expect(user1).toEqual({
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: {
        dog: 'Max'
      },
      deep: {
        deep2: {}
      }
    })

    // Custom blacklist (remove and add to the current schema blacklist)
    let user2 = await user.validate(doc1, {
      blacklist: [
        '-dog',
        '-animals.dog', // wrong property
        'pets.name',
        '-hiddenList',
        '-deep' // blacklist a parent
      ],
    })
    expect(user2).toEqual({
      list: [44, 54],
      dog: 'Bruce',
      pet: 'Freddy',
      pets: [ {}, {} ],
      animals: {
        dog: 'Max'
      },
      hiddenList: [12, 23],
      deep: {
        deep2: {
          deep3: {
            deep4: 'hideme'
          }
        }
      }
    })

    // Project whitelist
    let user4 = await user.validate(doc1, {
      project: [
        'dog',
        'pets.name',
        'deep'
      ],
    })
    expect(user4).toEqual({
      dog: 'Bruce',
      pets: [ {name: 'Pluto'}, {name: 'Milo'} ],
      deep: {
        deep2: {
          deep3: {
            deep4: 'hideme'
          }
        }
      }
    })
    db.close()
  })

}
