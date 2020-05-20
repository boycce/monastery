module.exports = function(monastery, db) {

  test('Model blacklisting', async (done) => {
    // Setup
    let db = monastery('localhost/monastery')
    let bird = db.model('bird', { fields: { name: { type: 'string' }}})
    let user = db.model('user', { 
      findBL: [
        'dog', 
        'animals.cat', 
        'pets.age', 
        'hiddenPets', 
        'hiddenList',
        'deep.deep2.deep3',
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
      deepModel: {
        myBird: bird1._id
      },
      hiddenDeepModel: {
        myBird: bird1._id
      }
    }})

    // For testing mongodb projection syntax
    // let find0 = await user._findOne(user1._id, { projection: {
    //   'pets': 1,
    //   'pets.name': 1
    // }})
    // console.log(find0.pets)

    // Test mongodb projections
    let find1 = await user.findOne({ query: user1._id })
    expect(find1).toEqual({
      _id: user1._id,
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: {
        dog: 'Max'
      },
      deepModel: {
        myBird: bird1._id
      }
    })

    // Test _removeBlacklisted which is used when populating
    let find2 = await user._findOne({ _id: user1._id })
    let res = user._removeBlacklisted(find2)
    expect(res).toEqual({
      _id: user1._id,
      list: [44, 54],
      pet: 'Freddy',
      pets: [{ name: 'Pluto' }, { name: 'Milo' }],
      animals: {
        dog: 'Max'
      },
      deepModel: {
        myBird: bird1._id
      }
    })

    db.close()
    done()
  })

}
