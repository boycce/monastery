module.exports = function(monastery, db) {

  test('Model setup', async () => {
    // Setup
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]],
      logo: { type: 'image' }
    }})

    // no fields defined
    expect(db.model('user2').fields).toEqual({})

    // Has model name
    expect(user.name).toEqual('user')

    // Basic field
    expect(user.fields.name).toEqual({ type: 'string', isString: true })

    // Image field
    expect(user.fields.logo).toEqual({ type: 'any', isAny: true, image: true })

    // Array field
    expect(user.fields.pets).toContainEqual({ type: 'string', isString: true })

    // Array schema
    expect(user.fields.pets.schema).toEqual({ type: 'array', isArray: true })

    // Subdocument field and schema
    expect(user.fields.colors).toEqual({
      red: { isString: true, type: 'string' },
      schema: { isObject: true, type: 'object' }
    })

    // Array array field (no array properties)
    expect(JSON.stringify(user.fields.points)).toEqual(JSON.stringify(
      [[{ type: 'number', isNumber: true }]]
    ))

    // Array array schema
    expect(user.fields.points.schema).toEqual({ type: 'array', isArray: true })
    expect(user.fields.points[0].schema).toEqual({ type: 'array', isArray: true })

    // Array array subdocument field (no array properties)
    expect(JSON.stringify(user.fields.points2)).toEqual(JSON.stringify(
      [[{
        x: { type: 'number', isNumber: true },
        schema: { type: 'object', isObject: true }
      }]]
    ))
  })

  test('Model setup with default fields', async () => {
    // Setup
    let db = monastery(false, { defaultObjects: true })

    // Default fields
    expect(db.model('user2').fields).toEqual({
      createdAt: {
        default: expect.any(Function),
        insertOnly: true,
        isInteger: true,
        type: "integer"
      },
      updatedAt: {
        default: expect.any(Function),
        isInteger: true,
        type: "integer"
      }
    })
  })

  test('Model setup with default objects', async () => {
    // Setup
    let db = monastery(false, { defaultObjects: true })
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]]
    }})

    // Array schema
    expect(user.fields.pets.schema).toEqual({
      type: 'array',
      isArray: true,
      default: expect.any(Function)
    })

    // Subdocument field and schema
    expect(user.fields.colors).toEqual({
      red: { isString: true, type: 'string' },
      schema: { isObject: true, type: 'object', default: expect.any(Function) }
    })
  })

  test('Model indexes', async (done) => {
    // Setup
    // Need to test different types of indexes
    let db = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
    let user = db.model('user', {})
    let zuser = db.model('zuser', {})

    // Text index setup
    let setupIndex1 = await user._setupIndexes({
      name: { type: 'string', index: 'text' }
    })

    // No text index change error, i.e. new Error("Index with name: text already exists with different options")
    await expect(user._setupIndexes({
      name: { type: 'string', index: 'text' },
      name2: { type: 'string', index: 'text' }
    })).resolves.toEqual(undefined)

    // Text index on a different model
    await expect(zuser._setupIndexes({
      name: { type: 'string', index: 'text' }
    })).resolves.toEqual(undefined)

    db.close()
    done()
  })

  test('Model findWL, findBLProject', async (done) => {
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
    let bird = db.model('bird', { fields: {
      name: { type: 'string' }
    }})
    let user = db.model('user', {
      findBL: [
        'pets.hiddenAge',
        'animals.hiddenCat',
        'hiddenDog',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.hiddenDeep3',
        'hiddenDeeper',
        'hiddenDeepModel',
        'hiddenDeepModels'
      ],
      fields: {
        list: [{ type: 'number' }],
        pet: { type: 'string' },
        anyPet: { type: 'any' },
        pets: [{ name: { type: 'string'}, hiddenAge: { type: 'number'} }],
        animals: {
          dog: { type: 'string' },
          hiddenCat: { type: 'string' }
        },
        deep: {
          deep2: {
            hiddenDeep3: {
              deep4: { type: 'string' }
            }
          }
        },
        deepModel: {
          myBird: { model: 'bird' }
        },
        deepModel2: {
          myBird: { model: 'bird' }
        },
        hiddenDog: { type: 'string' },
        hiddenPets: [{
          name: { type: 'string'}
        }],
        hiddenList: [{ type: 'number'}],
        hiddenDeeper: {
          deeper2: {
            deeper3: {
              deeper4: { type: 'string' }
            }
          }
        },
        hiddenDeepModel: {
          myBird: { model: 'bird' }
        },
        hiddenDeepModels: [{ model: 'bird' }]
      }
    })

    // Test findWL
    expect(user.findWL).toEqual([
      'list',
      'pet',
      'anyPet',
      'pets.name',
      'animals.dog',
      'deepModel.myBird',
      'deepModel2.myBird'
    ])

    // Test findBLProject
    expect(user.findBLProject).toEqual({
      'pets.hiddenAge': 0,
      'animals.hiddenCat': 0,
      'hiddenDog': 0,
      'hiddenPets': 0,
      'hiddenList': 0,
      'deep.deep2.hiddenDeep3': 0,
      'hiddenDeeper': 0,
      'hiddenDeepModel': 0,
      'hiddenDeepModels': 0
    })

    // Test inclusion of deep model blacklists
    var findBLProject = user._addDeepBlacklists(user.findBLProject, [
      'deepModel.myBird',
      'hiddenDeepModel.myBird',
      'hiddenDeepModels',
      {
        // raw $lookup object
        as: 'deepModel2.myBird'
      }
    ])
    expect(findBLProject).toEqual({
      'pets.hiddenAge': 0,
      'animals.hiddenCat': 0,
      'hiddenDog': 0,
      'hiddenPets': 0,
      'hiddenList': 0,
      'deep.deep2.hiddenDeep3': 0,
      'hiddenDeeper': 0,
      'hiddenDeepModel': 0,
      'hiddenDeepModels': 0,
      // Deep model blacklists
      "deepModel.myBird.password": 0,
      "deepModel2.myBird.password": 0
    })

    // Test whitelisting
    expect(user._addWhitelist(findBLProject, ['pets', 'deep.deep2.hiddenDeep3'])).toEqual({
      // 'pets.hiddenAge': 0,
      // 'deep.deep2.hiddenDeep3': 0,
      'animals.hiddenCat': 0,
      'hiddenDog': 0,
      'hiddenPets': 0,
      'hiddenList': 0,
      'hiddenDeeper': 0,
      'hiddenDeepModel': 0,
      'hiddenDeepModels': 0,
      // Deep model blacklists
      "deepModel.myBird.password": 0,
      "deepModel2.myBird.password": 0
    })

    // Test aggregate with projection exclusions. This is mainly to test how $lookup reacts
    let bird1 = await db.bird.insert({ data: { name: 'bird1' } })
    let bird2 = await db.bird.insert({ data: { name: 'bird2' } })
    let user1 = await db.user.insert({ data: {
      pet: 'carla',
      pets: [{ name: 'carla', hiddenAge: 12 }, { name: 'sparky', hiddenAge: 14 }],
      anyPet: { hi: 1234 },
      hiddenDeepModel: { myBird: bird1._id },
      hiddenDeepModels: [bird1._id, bird2._id]
    }})
    let res = await db.user._aggregate([
      { $match: { _id: user1._id } },
      { $lookup: {
        from: 'bird',
        localField: 'hiddenDeepModel.myBird',
        foreignField: '_id',
        as: 'hiddenDeepModel.myBird'
      }},
      { $lookup: {
        from: 'bird',
        localField: 'hiddenDeepModels',
        foreignField: '_id',
        as: 'hiddenDeepModels'
      }},
      { $project: {
        'anyPet': 0,
        'pets.hiddenAge': 0,
        'hiddenDeepModel.myBird': 0,
        'hiddenDeepModels.name': 0,
      }}
    ])
    expect(res[0]).toEqual({
      _id: user1._id,
      pet: 'carla',
      pets: [ { name: 'carla' }, { name: 'sparky' } ],
      hiddenDeepModel: {},
      hiddenDeepModels: [ { _id: bird1._id }, { _id: bird2._id } ]
    })

    db.close()
    done()
  })

}
