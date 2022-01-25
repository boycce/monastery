module.exports = function(monastery, opendb) {

  test('Virtuals', async () => {
    // Setup
    let db = (await opendb(null)).db
    // Test model setup
    let bird = db.model('bird', {
      fields: {
        age: { type: 'number', virtual: true, default: 55 },
        birdsOwner: { model: 'user' },
        name: { type: 'string' },
      }
    })
    let user = db.model('user', {
      fields: {
        myBird: { model: 'bird', virtual: true },
        myBirds: [{ model: 'bird', virtual: true }],
        name: { type: 'string' },
      }
    })
    expect(user.fields.name.virtual).toEqual(undefined)
    expect(user.fields.myBirds[0].virtual).toEqual(true)
    expect(user.fields.myBirds.schema.virtual).toEqual(true)

    // Test insert/update/validate
    let user1 = await user.insert({
      data: {
        myBird: db.id(), // shouldnt be added
        myBirds: [db.id()], // shouldnt be added
        name: 'Bruce',
      }
    })
    let bird1 = await bird.insert({
      data: {
        age: 12, // shouldnt be inserted
        birdsOwner: user1._id,
        name: 'Ponyo',
      }
    })
    let updatedBird1 = await bird.update({
      query: bird1._id,
      data: {
        age: 12, // shouldnt be added
        birdsOwner: user1._id,
        name: 'Ponyo2',
      }
    })
    let validatedBird1 = await bird.validate({
      age: 12, // shouldnt be included
      birdsOwner: user1._id,
      name: 'Ponyo',
    })
    expect(user1).toEqual({
      _id: user1._id,
      name: 'Bruce'
    })
    expect(bird1).toEqual({
      _id: bird1._id,
      birdsOwner: user1._id,
      name: 'Ponyo'
    })
    expect(updatedBird1).toEqual({
      birdsOwner: user1._id,
      name: 'Ponyo2'
    })
    expect(validatedBird1).toEqual({
      birdsOwner: user1._id,
      name: 'Ponyo'
    })

    // Test find
    let find1 = await user.findOne({
      query: user1._id,
      populate: [{
        as: 'myBirds',
        from: 'bird',
        let: { id: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $eq: ['$birdsOwner', '$$id']
            }
          }
        }]
      }]
    })
    expect(find1).toEqual({
      _id: user1._id,
      myBirds: [{
        _id: bird1._id,
        age: 55,
        birdsOwner:  user1._id,
        name: 'Ponyo2'
      }],
      name: 'Bruce'
    })

    // Test find is processing models for incorrect data structures
    let find2 = await user.findOne({
      query: user1._id,
      populate: [{
        // should be an object but the $lookup returns an array
        as: 'myBird',
        from: 'bird',
        let: { id: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $eq: ['$birdsOwner', '$$id']
            }
          }
        }]
      }, {
        // should be an array but the query returns an object
        as: 'myBirds',
        from: 'bird',
        let: { id: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $eq: ['$birdsOwner', '$$id']
            }
          }
        }]
      }],
      addFields: {
        myBirds: { $arrayElemAt: ['$myBirds', 0] }
      }
    })
    expect(find2).toEqual({
      _id: user1._id,
      myBird: [{
        _id: bird1._id,
        age: 55, // means the model was processed
        birdsOwner: user1._id,
        name: 'Ponyo2'
      }],
      myBirds: {
        _id: bird1._id,
        age: 55, // means the model was processed
        birdsOwner:  user1._id,
        name: 'Ponyo2'
      },
      name: 'Bruce'
    })

    db.close()
  })

  test('Insert/update virtuals (validate)', async () => {
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
    db.close()
  })

}
