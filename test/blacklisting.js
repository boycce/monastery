module.exports = function(monastery, db) {

  test('Find blacklisting', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
    let bird = db.model('bird', { fields: { name: { type: 'string' }}})
    let user = db.model('user', {
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
      }
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

    // NOte: testing mongodb projections

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

    // Test positive projection
    let find3 = await user.findOne({
      query: user1._id,
      project: ['dog', 'list', 'pets.age']
    })
    expect(find3).toEqual({
      _id: user1._id,
      dog: 'Bruce',
      list: [44, 54],
      pets: [{ age: 5 }, { age: 4 }]
    })

    // Test negative projection
    let find5 = await user.findOne({
      query: user1._id,
      project: [
        '-list', '-hiddenDeepModel', '-pet', '-pet', '-pets', '-deep', '-deeper', '-deepModel',
        '-dog', '-animals.cat'
      ]
    })
    expect(find5).toEqual({
      _id: user1._id,
      animals: { dog: 'Max' },
      hiddenList: [12, 23],
      hiddenPets: [{ name: 'secretPet' }]
    })

    db.close()
    done()
  })


  test('Find blacklisting (populate)', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
    let bird = db.model('bird', {
      fields: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    })
    let user = db.model('user', {
      fields: {
        dog: { type: 'string' },
        myBird: { model: 'bird' },
        myBird2: { model: 'bird' }
      }
    })
    let bird1 = await bird.insert({ data: {
      name: 'ponyo',
      age: 3
    }})
    let user1 = await user.insert({ data: {
      dog: 'Bruce',
      myBird: bird1._id,
      myBird2: bird1._id
    }})

    // Test project
    let find1 = await user.findOne({
      query: user1._id,
      populate: ['myBird', 'myBird2'],
      project: ['myBird', 'myBird2.age']
    })
    expect(find1).toEqual({
      _id: user1._id,
      myBird: { _id: bird1._id, age: 3, name: 'ponyo' },
      myBird2: { age: 3 }
    })

    // Test blacklisting
    let find2 = await user.findOne({
      query: user1._id,
      populate: ['myBird', 'myBird2'],
      blacklist: ['dog', 'myBird2.name', 'myBird2._id']
    })
    expect(find2).toEqual({
      _id: user1._id,
      myBird: { _id: bird1._id, age: 3, name: 'ponyo' },
      myBird2: { age: 3 }
    })

    // Test blacklisting overrides
    let find3 = await user.findOne({
      query: user1._id,
      populate: ['myBird', 'myBird2'],
      blacklist: ['dog', 'myBird2.name', 'myBird2._id', '-myBird2']
    })
    expect(find3).toEqual({
      _id: user1._id,
      myBird: { _id: bird1._id, age: 3, name: 'ponyo' },
      myBird2: { _id: bird1._id, age: 3, name: 'ponyo' }
    })

    db.close()
    done()
  })

  test('Insert/update blacklisting (validate)', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
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

    await db.user.find({ query: {}}) // wait for db to open before closing
    db.close()
    done()
  })

}
