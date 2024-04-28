module.exports.bird = {
  schema: function() {
    return {
      fields: {
        color: { type: 'string', default: 'red' },
        height: { type: 'number' },
        name: { type: 'string' },
        sub: {
          color: { type: 'string', default: 'red' },
        },
        wing: {
          size: { type: 'number' },
          sizes: {
            one: { type: 'number' },
            two: { type: 'number' },
          },
        },
      },
      findBL: ['wing'],
    }
  },
  mock: function() {
    return {
      height: 12,
      name: 'Ponyo',
      sub: {},
      wing: { size: 1, sizes: { one: 1, two: 1 }},
    }
  },
}

module.exports.user = {
  schema: function() {
    return {
      fields: {
        bird: { model: 'bird' },
        list: [{ type: 'number' }],
        dog: { type: 'string' },
        pet: { type: 'string' },
        pets: [{
          name: { type: 'string'},
          age: { type: 'number'},
        }],
        animals: {
          cat: { type: 'string' },
          dog: { type: 'string' },
        },
        hiddenPets: [{
          name: { type: 'string'},
        }],
        hiddenList: [{ type: 'number'}],
        deep: {
          deep2: {
            deep3: {
              deep4: { type: 'string' },
            },
          },
        },
        deeper: {
          deeper2: {
            deeper3: {
              deeper4: { type: 'string' },
            },
          },
        },
        deepModel: {
          myBird: { model: 'bird' },
        },
        hiddenDeepModel: {
          myBird: { model: 'bird' },
        },
      },
      findBL: [
        'dog',
        'animals.cat',
        'pets.age',
        'hiddenPets',
        'hiddenList',
        'deep.deep2.deep3',
        'deeper',
        'hiddenDeepModel',
      ],
    }
  },
  mock: function(bird1) {
    return {
      bird: bird1._id,
      list: [44, 54],
      dog: 'Bruce',
      pet: 'Freddy',
      pets: [{ name: 'Pluto', age: 5 }, { name: 'Milo', age: 4 }],
      animals: {
        cat: 'Ginger',
        dog: 'Max',
      },
      hiddenPets: [{
        name: 'secretPet',
      }],
      hiddenList: [12, 23],
      deep: {
        deep2: {
          deep3: {
            deep4: 'hideme',
          },
        },
      },
      deeper: {
        deeper2: {
          deeper3: {
            deeper4: 'hideme',
          },
        },
      },
      deepModel: {
        myBird: bird1._id,
      },
      hiddenDeepModel: {
        myBird: bird1._id,
      },
    }
  },
}
