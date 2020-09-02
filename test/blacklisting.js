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

    // Test mongodb projections
    let find1 = await user.findOne({ query: user1._id })
    expect(find1).toEqual({
      _id: user1._id,
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: { dog: 'Max' },
      deep: { deep2: {} },
      deepModel: { myBird: bird1._id }
    })

    db.close()
    done()
  })

  test('Validate blacklisting', async (done) => {
    // Setup
    let db = monastery('localhost/monastery', {
      defaultFields: false,
      serverSelectionTimeoutMS: 2000
    })
    let user = db.model('user', {
      insertBL: [
        'dog',
        'animals.cat',
        'pets.age',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.deep3'
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
        }
      }
    })

    // Blacklisting
    let user1 = await user.validate({
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
    })
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

    // Whitelisting
    let user2 = await user.validate({
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
    }, {
      whitelist: [
        'dog',
        'animals.dog', // wrong property
        'pets.age',
        'hiddenList',
        'deep' // whitelist a parent
      ],
    })
    expect(user2).toEqual({
      list: [44, 54],
      dog: 'Bruce',
      pet: 'Freddy',
      pets: [{ name: 'Pluto', age: 5 }, { name: 'Milo', age: 4 }],
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

    db.close()
    done()
  })

}
