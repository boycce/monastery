let bird = require('./mock/blacklisting.js').bird
let user = require('./mock/blacklisting.js').user
let util = require('../lib/util.js')

module.exports = function(monastery, opendb) {

  test('find blacklisting basic', async () => {
    // Setup
    let db = (await opendb(null)).db
    db.model('bird', bird.schema())
    db.model('user', user.schema())

    let bird1 = await db.bird.insert({ data: bird.mock() })
    let user1 = await db.user.insert({ data: user.mock(bird1) })

    // initial blacklist
    let find1 = await db.user.findOne({
      query: user1._id
    })
    expect(find1).toEqual({
      _id: user1._id,
      bird: bird1._id,
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max' },
      deep: { deep2: {} },
      deepModel: { myBird: bird1._id }
    })

    // augmented blacklist
    let find2 = await db.user.findOne({
      query: user1._id,
      blacklist: ['pet', 'pet', 'deep', 'deepModel', '-dog', '-animals.cat']
    })
    let customBlacklist
    expect(find2).toEqual((customBlacklist = {
      _id: user1._id,
      bird: bird1._id,
      dog: 'Bruce',
      list: [44, 54],
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max', cat: 'Ginger' }
    }))

    // blacklist string
    let find3 = await db.user.findOne({
      query: user1._id,
      blacklist: 'pet pet deep deepModel -dog -animals.cat'
    })
    expect(find3).toEqual(customBlacklist)

    // blacklist removal
    let find4 = await db.user.findOne({ query: user1._id, blacklist: false })
    expect(find4).toEqual(user1)

    db.close()
  })

  test('find blacklisting population', async () => {
    // Setup
    let db = (await opendb(null)).db
    db.model('bird', bird.schema())
    db.model('user', {
      fields: {
        dog: { type: 'string' },
        bird: { model: 'bird' },
      },
    })

    let bird1 = await db.bird.insert({ data: bird.mock() })
    let user1 = await db.user.insert({ data: {
      dog: 'Bruce',
      bird: bird1._id,
    }})

    let bird1Base = {
      _id: bird1._id,
      color: 'red',
      sub: { color: 'red' }
    }

    // 'bird1.name',                                 // bird1.name & bird1.wing blacklisted
    // '-bird2', 'bird2.name',                       // bird2.name blacklisted
    // 'bird3.name', '-bird3', 'bird3.height',       // bird3.height blacklisted
    // '-bird4.wing.sizes.one', '-bird4.wing.size',  // ignored
    //        bird4.wing.sizes.two blacklisted (expand in future verion)
    // '-bird5.wing.sizes.one',                      // bird5.wing.sizes.one ignored, wing blacklisted
    //        bird5.wing.sizes.two, wing.size blacklisted (expand in future verion)

    // test 1
    db.user.findBL = ['bird.name']
    expect(await db.user.findOne({ query: user1._id, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, height: 12 },
    })
    // test 2
    db.user.findBL = ['-bird', 'bird.name']
    expect(await db.user.findOne({ query: user1._id, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, height: 12, wing: { size: 1, sizes: { one: 1, two: 1 }} },
    })
    // test 3
    db.user.findBL = ['bird.name', '-bird', 'bird.height']
    expect(await db.user.findOne({ query: user1._id, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, name: 'Ponyo', wing: { size: 1, sizes: { one: 1, two: 1 }} },
    })
    // test 4
    db.user.findBL = ['-bird.wing.sizes.one', '-bird.wing.size']
    expect(await db.user.findOne({ query: user1._id, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, name: 'Ponyo', height: 12 },
    })
    // test 5
    db.user.findBL = ['-bird.wing.sizes.one']
    expect(await db.user.findOne({ query: user1._id, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, name: 'Ponyo', height: 12 },
    })
    // blacklist removal
    expect(await db.user.findOne({ query: user1._id, blacklist: false, populate: ['bird'] })).toEqual({
      ...user1,
      bird: { ...bird1Base, height: 12, name: 'Ponyo', wing: { size: 1, sizes: { one: 1, two: 1 }} },
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
      findBL: ['age'],
    })
    let user = db.model('user', {
      fields: {
        dog: { type: 'string' },
        bird: { model: 'bird' },
        bird2: { model: 'bird' },
        bird3: { model: 'bird' },
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
      sub: {},
    }})
    let user1 = await user.insert({ data: {
      dog: 'Bruce',
      bird: bird1._id,
      bird2: bird1._id,
      bird3: bird1._id,
    }})

    // project
    let find1 = await user.findOne({
      query: user1._id,
      populate: ['bird', 'bird2'],
      project: ['bird.age', 'bird2'],
    })
    expect(find1).toEqual({
      _id: user1._id,
      bird: { age: 3 },
      bird2: { _id: bird1._id, age: 3, name: 'ponyo', height: 40, color: 'red', sub: { color: 'red' }},
    })

    // project (different project details)
    let find2 = await user.findOne({
      query: user1._id,
      populate: ['bird', 'bird2'],
      project: ['bird', 'bird2.height'],
    })
    let customProject
    expect(find2).toEqual((customProject={
      _id: user1._id,
      bird: { _id: bird1._id, age: 3, name: 'ponyo', height: 40, color: 'red', sub: { color: 'red' }},
      bird2: { height: 40 },
    }))

    // project string
    let find3 = await user.findOne({
      query: user1._id,
      populate: ['bird', 'bird2'],
      project: 'bird bird2.height',
    })
    expect(find3).toEqual(customProject)

    db.close()
  })

  test('insert blacklisting (validate)', async () => {
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
        // '_id', // default
        'dog',
        'animals.cat',
        'pets.age',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.deep3'
      ],
      updateBL: [
        // '_id' // default
      ],
    })
    let doc1Id = db.id()
    let doc1 = {
      _id: doc1Id,
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

    // Custom insert blacklist (remove and add to the current schema blacklist)
    let user2 = await user.validate(doc1, {
      blacklist: [
        '-_id',
        '-dog',
        '-animals.dog', // wrong property
        'pets.name',
        '-hiddenList',
        '-deep' // blacklist a parent
      ],
    })
    let customBlacklist
    expect(user2).toEqual((customBlacklist = {
      _id: doc1Id,
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
    }))

    // Blacklist string
    let user3 = await user.validate(doc1, {
      blacklist: '-_id -dog -animals.dog pets.name -hiddenList -deep'
    })
    expect(user3).toEqual(customBlacklist)

    // Blacklist removal
    let user4 = await user.validate(doc1, { blacklist: false })
    expect(user4).toEqual(doc1)

    // Project whitelist
    let user5 = await user.validate(doc1, {
      project: [
        'dog',
        'pets.name',
        'deep'
      ],
    })
    expect(user5).toEqual({
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

    // double check that _id.insertOnly is working
    let user6 = await user.validate(doc1, { update: true, blacklist: false })
    expect(user6).toEqual({
      ...doc1,
      _id: undefined,
    })

    db.close()
  })

  test('findOneAndUpdate blacklisting general', async () => {
    // todo: test all findOneAndUpdate options
    // todo: test find & update hooks
    let db = (await opendb(null)).db
    db.model('bird', bird.schema())
    db.model('user', user.schema())

    let bird1 = await db.bird.insert({ data: bird.mock() })
    let user1 = await db.user.insert({ data: user.mock(bird1) })

    // augmented blacklist
    let find2 = await db.user.findOneAndUpdate({
      query: user1._id,
      data: { dog: 'Bruce2', pet: 'Freddy2' }, // pet shouldn't update
      blacklist: ['pet', 'deep', 'deepModel', '-dog', '-animals.cat'],
    })
    expect(find2).toEqual({
      _id: user1._id,
      bird: bird1._id,
      dog: 'Bruce2',
      list: [44, 54],
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max', cat: 'Ginger' },
    })
    expect(await db.user.findOne({ query: user1._id, project: ['pet'] })).toEqual({
      _id: user1._id,
      pet: 'Freddy',
    })

    db.close()
  })

  test('findOneAndUpdate blacklisting populate', async () => {
    let db = (await opendb(null)).db
    db.model('bird', bird.schema())
    db.model('user', user.schema())

    let bird1 = await db.bird.insert({ data: bird.mock() })
    let user1 = await db.user.insert({ data: user.mock(bird1) })

    // augmented blacklist
    let find2 = await db.user.findOneAndUpdate({
      query: user1._id,
      data: { dog: 'Bruce2', pet: 'Freddy2' }, // pet shouldn't update
      blacklist: [
        'pet', 'deep', 'deepModel', '-dog', '-animals.cat',
        'bird.name', '-bird', 'bird.height' // <- populated model
      ],
      populate: ['bird'],
    })
    expect(find2).toEqual({
      _id: user1._id,
      bird: {
        ...util.omit(bird1, ['height']),
      },
      dog: 'Bruce2',
      list: [44, 54],
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max', cat: 'Ginger' },
    })
    expect(await db.user.findOne({ query: user1._id, project: ['pet'] })).toEqual({
      _id: user1._id,
      pet: 'Freddy',
    })

    db.close()
  })

}
