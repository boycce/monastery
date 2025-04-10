// Todo: split out basic 'type' tests
const monastery = require('../lib/index.js')
const Model = require('../lib/model.js')

let db
beforeAll(async () => { db = monastery.manager('127.0.0.1/monastery', { timestamps: false }) })
afterAll(async () => { db.close() })

test('validation basic errors', async () => {
  let user = db.model('user', { fields: {
    date: { type: 'date' },
    name: { type: 'string', required: true },
    colors: [{ type: 'string' }],
    animals: { dog: { type: 'string' }},
  }})

  // Required error (insert)
  await expect(user.validate({})).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'name' },
  })
  await expect(user.validate({ name : '' })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'name' },
  })

  // No required error (update)
  await expect(user.validate({}, { update: true })).resolves.toEqual({})

  // Type error (string)
  await expect(user.validate({ name: 1 })).resolves.toEqual({ name: '1' })
  await expect(user.validate({ name: 1.123 })).resolves.toEqual({ name: '1.123' })
  await expect(user.validate({ name: undefined })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'name' },
  })
  await expect(user.validate({ name: null })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'name' },
  })
  await expect(user.validate({ name: true })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'Value was not a string.',
    meta: { rule: 'isString', model: 'user', field: 'name' },
  })


  // Type error (date)
  let userdate = db.model('userdate', { fields: { amount: { type: 'date', required: true }}})
  let userdate2 = db.model('userdate2', { fields: { amount: { type: 'date' }}})
  await expect(userdate.validate({ amount: 0 })).resolves.toEqual({ amount: 0 })
  await expect(userdate.validate({ amount: '0' })).resolves.toEqual({ amount: 0 })
  await expect(userdate.validate({ amount: '1646778655000' })).resolves.toEqual({ amount: 1646778655000 })
  await expect(userdate2.validate({ amount: '' })).resolves.toEqual({ amount: null })
  await expect(userdate2.validate({ amount: null })).resolves.toEqual({ amount: null })
  await expect(userdate.validate({ amount: 'badnum' })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'Value was not a unix timestamp.',
    meta: { rule: 'isDate', model: 'userdate', field: 'amount' },
  }])
  await expect(userdate.validate({ amount: false })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'Value was not a unix timestamp.',
    meta: { rule: 'isDate', model: 'userdate', field: 'amount' },
  }])
  await expect(userdate.validate({ amount: undefined })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'userdate', field: 'amount' },
  }])
  await expect(userdate.validate({ amount: null })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'userdate', field: 'amount' },
  }])


  // Type error (number)
  let usernum = db.model('usernum', { fields: { amount: { type: 'number', required: true }}})
  let usernum2 = db.model('usernum2', { fields: { amount: { type: 'number' }}})
  await expect(usernum.validate({ amount: 0 })).resolves.toEqual({ amount: 0 })
  await expect(usernum.validate({ amount: '0' })).resolves.toEqual({ amount: 0 })
  await expect(usernum.validate({ amount: '1646778655000' })).resolves.toEqual({ amount: 1646778655000 })
  await expect(usernum2.validate({ amount: '' })).resolves.toEqual({ amount: null })
  await expect(usernum2.validate({ amount: null })).resolves.toEqual({ amount: null })
  await expect(usernum.validate({ amount: 'badnum' })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'Value was not a number.',
    meta: { rule: 'isNumber', model: 'usernum', field: 'amount' },
  }])
  await expect(usernum.validate({ amount: false })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'Value was not a number.',
    meta: { rule: 'isNumber', model: 'usernum', field: 'amount' },
  }])
  await expect(usernum.validate({ amount: undefined })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'usernum', field: 'amount' },
  }])
  await expect(usernum.validate({ amount: null })).rejects.toEqual([{
    status: '400',
    title: 'amount',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'usernum', field: 'amount' },
  }])

  // Type error (array)
  await expect(user.validate({ name: 'a', colors: 1 })).rejects.toContainEqual({
    status: '400',
    title: 'colors',
    detail: 'Value was not an array.',
    meta: { rule: 'isArray', model: 'user', field: 'colors' },
  })

  // Type error (array)
  await expect(user.validate({ name: 'a', colors: null })).rejects.toContainEqual({
    status: '400',
    title: 'colors',
    detail: 'Value was not an array.',
    meta: { rule: 'isArray', model: 'user', field: 'colors' },
  })

  // Type error (object)
  await expect(user.validate({ name: 'a', animals: [] })).rejects.toContainEqual({
    status: '400',
    title: 'animals',
    detail: 'Value was not an object.',
    meta: { rule: 'isObject', model: 'user', field: 'animals' },
  })

  // Type error (object)
  await expect(user.validate({ name: 'a', animals: null })).rejects.toContainEqual({
    status: '400',
    title: 'animals',
    detail: 'Value was not an object.',
    meta: { rule: 'isObject', model: 'user', field: 'animals' },
  })
})

test('validation type any', async () => {
  let user1 = db.model('user', { 
    fields: { 
      name: { type: 'any' },
    },
  })
  // Any type on field
  await expect(user1.validate({ name: 'benjamin' })).resolves.toEqual({ name: 'benjamin' })
  await expect(user1.validate({ name: 1 })).resolves.toEqual({ name: 1 })
  await expect(user1.validate({ name: null })).resolves.toEqual({ name: null })
  await expect(user1.validate({ name: true })).resolves.toEqual({ name: true })
  await expect(user1.validate({ name: false })).resolves.toEqual({ name: false })
  await expect(user1.validate({ name: [1, 2] })).resolves.toEqual({ name: [1, 2] })
  await expect(user1.validate({ name: { first: 1 } })).resolves.toEqual({ name: { first: 1 } })
})

test('validation schema with reserved and invalid rules', async () => {
  const db2 = monastery.manager('127.0.0.1/monastery', { logLevel: 0 })
  let user = db2.model('user-model', {
    fields: {
      sub: {
        name: {
          type: 'string',
          default: true, // reserved keyword
          invalidRule: {}, // no rule function found
          validRule: true,
        },
      },
    },
    rules: {
      default: (value) => { // function shouldn't run (i.e. value still is 'Martin')
        return false
      },
      validRule: (value) => {
        if (value === 'Martin') return true
      },
    },
  })
  await expect(user.validate({ sub: { name: 'Martin' } })).resolves.toEqual({
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    sub: {
      name: 'Martin',
    },
  })
  db2.close()
})

test('validation strict false', async () => {
  let user1 = db.model('user', { 
    fields: {
      name: { type: 'string' },
    },
  })
  // strict on (default)
  let inserted1 = await user1.insert({ data: { nonDefinedField: 1 } })
  expect(inserted1).toEqual({
    _id: inserted1._id,
  })
  let user2 = db.model('user', { 
    fields: {
      name: { type: 'string' },
      sub: {
        name: { type: 'string' },
        schema: { strict: false },
      },
      subArray: [{
        name: { type: 'string' },
        schema: { strict: false },
      }],
      schema: { strict: false },
    },
  })
  // strict off
  let inserted2 = await user2.insert({ data: { nonDefinedField: 1 } })
  expect(inserted2).toEqual({
    _id: inserted2._id,
    nonDefinedField: 1,
  })
})

test('validation subdocument errors', async () => {
  let user = db.model('user', { fields: {
    animals: {
      cat: { type: 'string', required: true }, // {} = required on insert
      dog: {
        name:  { type: 'string' },
        color: { type: 'string', required: true }, // {} = required on insert
      },
    },
  }})

  // Insert: Required subdocument properties
  await expect(user.validate({})).rejects.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: '400',
        title: 'animals.cat',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'cat' },
      }),
      expect.objectContaining({
        status: '400',
        title: 'animals.dog.color',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'color' },
      }),
    ])
  )

  // Insert: Required subdocument properties
  await expect(user.validate({ animals: {} })).rejects.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: '400',
        title: 'animals.cat',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'cat' },
      }),
      expect.objectContaining({
        status: '400',
        title: 'animals.dog.color',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'color' },
      }),
    ])
  )

  // Insert: Invalid subdocument type
  await expect(user.validate({ animals: { dog: 1 }})).rejects.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: '400',
        title: 'animals.cat',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'cat' },
      }),
      expect.objectContaining({
        status: '400',
        title: 'animals.dog',
        detail: 'Value was not an object.',
        meta: { rule: 'isObject', model: 'user', field: 'dog' },
      }),
    ])
  )

  // Insert: Required subdocument property is ignored with a parent/grandparent specificed
  await expect(user.validate({ animals: {} }, { validateUndefined: false })).resolves.toEqual({
    animals: {},
  })

  // Update: Required subdocument property when a parent/grandparent is specified
  await expect(user.validate({ animals: {} }, { update: true })).rejects.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: '400',
        title: 'animals.cat',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'cat' },
      }),
      expect.objectContaining({
        status: '400',
        title: 'animals.dog.color',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'color' },
      }),
    ])
  )

  // Update: Required subdocument property when a parent is specified
  await expect(user.validate({ animals: { dog: {}} }, { update: true })).rejects.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: '400',
        title: 'animals.cat',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'cat' },
      }),
      expect.objectContaining({
        status: '400',
        title: 'animals.dog.color',
        detail: 'This field is required.',
        meta: { rule: 'required', model: 'user', field: 'color' },
      }),
    ])
  )

  // Update: Ignore required subdocument property when root parent is undefined
  await expect(user.validate({}, { update: true })).resolves.toEqual({})


  // Update: Ignore required subdocument property with a defined parent when validateUndefined = false
  await expect(user.validate({ animals: {} }, { update: true, validateUndefined: false })).resolves.toEqual({
    animals: {},
  })

  // Update: Required defined subdocument property when validateUndefined = false
  await expect(user.validate({ animals: { cat: '' }}, { update: true, validateUndefined: false }))
  .rejects.toContainEqual({
    status: '400',
    title: 'animals.cat',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'cat' },
  })
})

test('validation array errors', async () => {
  let user = db.model('user', { fields: {
    animals: {
      cats: [{ type: 'string' }],
      dogs: [{
        name:  { type: 'string' },
        color: { type: 'string', required: true },
      }],
    },
  }})

  // Type error within an array (string)
  await expect(user.validate({
    animals: { cats: [true] },
  })).rejects.toContainEqual({
    status: '400',
    title: 'animals.cats.0',
    detail: 'Value was not a string.',
    meta: { rule: 'isString', model: 'user', field: '0' },
  })

  // Type error within an array subdocument (string)
  let error = {
    status: '400',
    title: 'animals.dogs.0.color',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'color' },
  }
  await expect(user.validate({ animals: { dogs: [{ name: 'sparky', color: false }] }}))
    .rejects.toContainEqual({
      ...error,
      detail: 'Value was not a string.',
      meta: { rule: 'isString', model: 'user', field: 'color' },
    })

  // Requried error within an array subdocument
  await expect(user.validate({ animals: { dogs: [{ name: 'sparky' }] }}))
    .rejects.toContainEqual(error)

  // Requried error within an array subdocument (even during update when parent defined)
  await expect(user.validate({ animals: { dogs: [{ name: 'sparky' }] }}, { update: true }))
    .rejects.toContainEqual(error)

  // No item errors for empty arrays
  await expect(user.validate({ animals: { dogs: [] }}))
    .resolves.toEqual({ animals: { dogs: [] }})

  // No undefined item errors with validateUndefined=false
  await expect(user.validate(
    { animals: { dogs: [{ name: 'sparky' }] }},
    { update: true, validateUndefined: false }
  ))
    .resolves.toEqual({ animals: { dogs: [{ name: 'sparky' }] }})

  // Requried error within an array subdocument (even during update when parent defined && validateUndefined = false)
  await expect(user.validate(
    { animals: { dogs: [{ name: 'sparky', color: '' }] }},
    { update: true, validateUndefined: false }
  ))
    .rejects.toContainEqual(error)
})

test('validation array schema errors', async () => {
  function arrayWithSchema(array, schema) {
    array.schema = schema
    return array
  }
  let user = db.model('user', { fields: {
    animals: arrayWithSchema(
      [{ type: 'string' }],
      { required: true, minLength: 2 }
    ),
  }})

  // MinLength error
  await expect(user.validate({
    animals: [],
  })).rejects.toContainEqual({
    status: '400',
    title: 'animals',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', field: 'animals' },
  })

  // MinLength error
  await expect(user.validate({
    animals: ['dog'],
  })).rejects.toContainEqual({
    status: '400',
    title: 'animals',
    detail: 'Value needs to contain a minimum of 2 items.',
    meta: { rule: 'minLength', model: 'user', field: 'animals' },
  })
})

test('validation getMostSpecificKeyMatchingPath', async () => {
  let user = db.model('user', {
    fields: {
      name: { type: 'string' },
    },
    messages: {
      // these are sorted when trhe model's initialised
      'cats.name': {},

      'dogs.name': {},
      'dogs.$.name': {},

      'pigs.name': {},
      'pigs.$.name': {},
      'pigs.1.name': {},
      'pigs.2.name': {},

      'gulls.$': {},
      'gulls.$.$': {},
      'gulls.name': {},
      'gulls.$.name': {},
    },
  })

  let fn = Model.prototype._getMostSpecificKeyMatchingPath
  // subdocument
  expect(fn(user.messages, 'cats.name')).toEqual('cats.name')
  // array subdocuments
  // expect(fn(user.messages, 'cats.1.name')).toEqual('cats.name') // no longer matches
  expect(fn(user.messages, 'dogs.1.name')).toEqual('dogs.$.name')
  expect(fn(user.messages, 'dogs.2.name')).toEqual('dogs.$.name')
  expect(fn(user.messages, 'pigs.1.name')).toEqual('pigs.1.name')
  expect(fn(user.messages, 'pigs.2.name')).toEqual('pigs.2.name')
  expect(fn(user.messages, 'pigs.3.name')).toEqual('pigs.$.name')
  // array
  expect(fn(user.messages, 'gulls.1.2')).toEqual('gulls.$.$')
  expect(fn(user.messages, 'gulls.1')).toEqual('gulls.$')
})

test('validation default messages', async () => {
  let user = db.model('user', {
    fields: {
      name: { type: 'string', minLength: 4 },
      dog: { name: { type: 'string', minLength: 4 }},
      dogNames: [{ type: 'string', minLength: 4 }],
      animals: [{
        name: { type: 'string', minLength: 4 },
      }],
    },
  })

  let mock = {
    status: '400',
    title: 'name',
    detail: 'Value needs to be at least 4 characters long.',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  }

  // basic error
  await expect(user.validate({ name: 'ben' })).rejects.toContainEqual(
    mock
  )

  // subdocument error
  await expect(user.validate({ dog: { name: 'ben' } })).rejects.toContainEqual({
    ...mock,
    title: 'dog.name',
  })

  // array error
  await expect(user.validate({ dogNames: ['ben'] })).rejects.toContainEqual({
    ...mock,
    title: 'dogNames.0',
    meta: { ...mock.meta, field: '0' },
  })

  // subdocument in an array error
  await expect(user.validate({ animals: [{ name: 'ben' }] })).rejects.toContainEqual({
    ...mock,
    title: 'animals.0.name',
  })

  // subdocument in an array error (different index)
  await expect(user.validate({ animals: [{ name: 'carla' }, { name: 'ben' }] })).rejects.toContainEqual({
    ...mock,
    title: 'animals.1.name',
  })
})

test('validation custom messages', async () => {
  // Todo: Setup testing for array array subdocument field messages
  // let arrayWithSchema = (array, schema) => { array.schema = schema; return array }
  let user = db.model('user', {
    fields: {
      name: { type: 'string', minLength: 4 },
      dog: { name: { type: 'string', minLength: 4 }},
      dogNames: [{ type: 'string', minLength: 4 }],
    },
    messages: {
      'name': { minLength: 'Oops min length is 4' },
      'dog.name': { minLength: 'Oops min length is 4' },
      'dogNames.$': { minLength: 'Oops min length is 4' },
    },
  })

  let mock = {
    status: '400',
    title: 'name',
    detail: 'Oops min length is 4',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  }

  // basic error
  await expect(user.validate({ name: 'ben' })).rejects.toContainEqual(
    mock
  )
  // subdocument error
  await expect(user.validate({ dog: { name: 'ben' } })).rejects.toContainEqual({
    ...mock,
    title: 'dog.name',
  })
  // array error
  await expect(user.validate({ dogNames: ['ben'] })).rejects.toContainEqual({
    ...mock,
    title: 'dogNames.0',
    meta: { ...mock.meta, field: '0' },
  })
})

test('validation custom messages for arrays', async () => {
  // Todo: Setup testing for array array subdocument field messages
  let arrayWithSchema = (array, schema) => { array.schema = schema; return array }
  let user = db.model('user', {
    fields: {
      dogNames: arrayWithSchema([
        arrayWithSchema([{ type: 'string' }], { minLength: 1 }),
      ], { minLength: 1 }),
      catNames: [{
        name: { type: 'string', minLength: 4 },
      }],
      pigNames: [
        [{
          name: { type: 'string', minLength: 4 },
        }],
      ],
    },
    messages: {
      'dogNames': { minLength: 'add one dog name' },
      'dogNames.$': { minLength: 'add one sub dog name' },

      'catNames.$.name': { minLength: 'min length error (name)' },
      'catNames.1.name': { minLength: 'min length error (1)' },
      'catNames.2.name': { minLength: 'min length error (2)' },

      // 'pigNames.$.$.name': { minLength: 'min length error (name)' },
      'pigNames.$.$.name': { minLength: 'min length error ($ $)' },   // catches 
      'pigNames.$.1.name': { minLength: 'min length error ($ 1)' },   
      'pigNames.2.$.name': { minLength: 'min length error (2 $)' },
      'pigNames.0.2.name': { minLength: 'min length error (0 2)' },
      'pigNames.$.2.name': { minLength: 'min length error ($ 2)' },
    },
  })

  // Empty array
  await expect(user.validate({ dogNames: [] })).rejects.toContainEqual({
    status: '400',
    title: 'dogNames',
    detail: 'add one dog name',
    meta: { rule: 'minLength', model: 'user', field: 'dogNames' },
  })
  // Empty sub array
  await expect(user.validate({ dogNames: [['carla']] })).resolves.toEqual({ dogNames: [['carla']] })
  await expect(user.validate({ dogNames: [[]] })).rejects.toContainEqual({
    status: '400',
    title: 'dogNames.0',
    detail: 'add one sub dog name',
    meta: { rule: 'minLength', model: 'user', field: '0' },
  })


  // array-subdocument-field error (loose match)
  await expect(user.validate({ catNames: [{ name: 'ben' }] })).rejects.toContainEqual({
    status: '400',
    title: 'catNames.0.name',
    detail: 'min length error (name)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-1-field error
  await expect(user.validate({ catNames: [{ name: 'carla' }, { name: 'ben' }] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'catNames.1.name',
    detail: 'min length error (1)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-2-field error
  await expect(user.validate({ catNames: [{ name: 'carla' }, { name: 'carla' }, { name: 'ben' }] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'catNames.2.name',
    detail: 'min length error (2)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })


  // array-subdocument-field error (loose $ match)
  await expect(user.validate({ pigNames: [[{ name: 'ben' }]] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'pigNames.0.0.name',
    detail: 'min length error ($ $)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-1-field error
  await expect(user.validate({ pigNames: [[{ name: 'carla' }, { name: 'ben' }]] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'pigNames.0.1.name',
    detail: 'min length error ($ 1)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-2-0-field error (lower fallback)
  await expect(user.validate({ pigNames: [[],[],[{ name: 'ben' }]] })).rejects.toContainEqual({
    status: '400',
    title: 'pigNames.2.0.name',
    detail: 'min length error (2 $)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-0-2-field error
  await expect(user.validate({ pigNames: [[{ name: 'carla' }, { name: 'carla' }, { name: 'ben' }]] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'pigNames.0.2.name',
    detail: 'min length error (0 2)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
  // array-subdocument-2-0-field error (fallback)
  await expect(user.validate({ pigNames: [[], [{ name: 'carla' },{ name: 'carla' },{ name: 'ben' }], []] }))
  .rejects.toContainEqual({
    status: '400',
    title: 'pigNames.1.2.name',
    detail: 'min length error ($ 2)',
    meta: { rule: 'minLength', model: 'user', field: 'name' },
  })
})

test('validation custom rules', async () => {
  let user = db.model('user', {
    fields: {
      name: { type: 'string', bigName: 8 },
      animals: [{
        name: { type: 'string', bigName: 8 },
      }],
    },
    rules: {
      bigName: function(value, ruleArg) {
        return value.length >= ruleArg
      },
    },
  })
  let user2 = db.model('user2', {
    fields: {
      name: { type: 'string' },
      nickname: { type: 'string', requiredIfNoName: true },
      age: { type: 'number', required: true },
    },
    rules: {
      requiredIfNoName: {
        validateUndefined: true,
        fn: function(value, ruleArg) {
          return value || this.name
        },
      },
    },
  })

  // Basic field
  await expect(user.validate({ name: 'benjamin' })).resolves.toEqual({ name: 'benjamin' })
  await expect(user.validate({ name: 'ben' })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'Invalid data property for rule "bigName".',
    meta: { rule: 'bigName', model: 'user', field: 'name' },
  })

  // subdocument in an array
  await expect(user.validate({ animals: [{ name: 'benjamin' }] })).resolves.toEqual({
    animals: [{ name: 'benjamin' }],
  })
  await expect(user.validate({ animals: [{ name: 'ben' }] })).rejects.toContainEqual({
    status: '400',
    title: 'animals.0.name',
    detail: 'Invalid data property for rule "bigName".',
    meta: { rule: 'bigName', model: 'user', field: 'name' },
  })

  // Required rule based off another field (create)
  await expect(user2.validate({ name: 'benjamin', age: 12 })).resolves.toEqual({
    name: 'benjamin',
    age: 12,
  })
  await expect(user2.validate({ nickname: 'benny', age: 12 })).resolves.toEqual({
    nickname: 'benny',
    age: 12,
  })
  await expect(user2.validate({ })).rejects.toEqual([
    {
      'detail': 'Invalid data property for rule "requiredIfNoName".',
      'meta': { 'field': 'nickname', 'model': 'user2', 'rule': 'requiredIfNoName'},
      'status': '400',
      'title': 'nickname',
    }, {
      'detail': 'This field is required.',
      'meta': { 'field': 'age', 'model': 'user2', 'rule': 'required'},
      'status': '400',
      'title': 'age',
    },
  ])
  await expect(user2.validate({  }, { validateUndefined: false })).resolves.toEqual({})

  // Required rule based off another field (update)
  await expect(user2.validate({ }, { update: true })).resolves.toEqual({})
  await expect(user2.validate({ nickname: '' }, { update: true })).rejects.toEqual([{
    'detail': 'Invalid data property for rule "requiredIfNoName".',
    'meta': { 'field': 'nickname', 'model': 'user2', 'rule': 'requiredIfNoName'},
    'status': '400',
    'title': 'nickname',
  }])
})

test('validated data', async () => {
  let fields = {
    age: { type: 'number' },
    name: { type: 'string' },
    names: [{ type: 'string' }],
    animals: {
      dog: { type: 'string' },
      dogs: [{ name: { type: 'string' } }],
    },
  }
  fields.names.schema = { nullObject: true }
  fields.animals.schema = { nullObject: true }
  let user = db.model('user', { fields: fields })

  // No data
  await expect(user.validate({})).resolves.toEqual({})

  // Ignores invalid data
  await expect(user.validate({ badprop: true, schema: {} })).resolves.toEqual({})

  // String data
  await expect(user.validate({ name: 'Martin Luther' })).resolves.toEqual({ name: 'Martin Luther' })
  await expect(user.validate({ name: null })).resolves.toEqual({ name: null })

  // Number data
  await expect(user.validate({ age: 1 })).resolves.toEqual({ age: 1 })
  await expect(user.validate({ age: Infinity })).resolves.toEqual({ age: Infinity })
  await expect(user.validate({ age: NaN })).resolves.toEqual({ age: NaN })
  await expect(user.validate({ age: null })).resolves.toEqual({ age: null })

  // Array data
  await expect(user.validate({ names: ['blue'] })).resolves.toEqual({ names: ['blue'] })

  // Array data (empty)
  await expect(user.validate({ names: [] })).resolves.toEqual({ names: [] })

  // Subdocument data
  await expect(user.validate({ animals: { dog: 'sparky' } }))
    .resolves.toEqual({ animals: { dog: 'sparky' } })

  // Subdocument data (empty)
  await expect(user.validate({ animals: {} })).resolves.toEqual({ animals: {} })

  // Subdocument data (null/string)
  await expect(user.validate({ animals: '', names: null })).resolves.toEqual({ animals: null, names: null })

  // Subdocument property data (null)
  await expect(user.validate({ animals: { dog: null }}))
    .resolves.toEqual({ animals: { dog: null }})

  // Subdocument property data (unknown data)
  await expect(user.validate({ animals: { dog: 'sparky', cat: 'grumpy' } }))
    .resolves.toEqual({ animals: { dog: 'sparky' } })

  // Subdocument -> array -> subdocument data
  await expect(user.validate({ animals: { dogs: [{ name: 'sparky' }] }}))
    .resolves.toEqual({ animals: { dogs: [{ name: 'sparky' }] }})

  // Subdocument -> array -> subdocument data (empty)
  await expect(user.validate({ animals: { dogs: [{}] }}))
    .resolves.toEqual({ animals: { dogs: [{}] }})

  // _id is blacklisted by default
  let id = db.id()
  await expect(user.validate({ _id: id })).resolves.toEqual({})
  await expect(user.validate({ _id: id }, { update: true })).resolves.toEqual({})
})

test('schema options', async () => {
  let user = db.model('user', { fields: {
    name: { type: 'string', 'insertOnly': true },
  }})
  let user2 = db.model('user2', { fields: {
    name: { type: 'string', defaultOverride: true, default: 'Martin Luther' },
  }})
  let user4 = db.model('user4', { fields: {
    name: { model: true },
  }})

  // Ignore insertOnly fields when updating
  await expect(user.validate({ name: 'Martin Luther' }, { update: true })).resolves.toEqual({})

  // Default
  await expect(user2.validate({})).resolves.toEqual({ name: 'Martin Luther' })

  // Default override
  await expect(user2.validate({ name : 'temp' })).resolves.toEqual({ name: 'Martin Luther' })

  // Model id (ObjectId)
  let data = await user4.validate({ name: '5d4356299d0f010017602f6b' })
  await expect(data.name.toString()).toEqual(db.id('5d4356299d0f010017602f6b').toString())
  await expect(data.name).toEqual(expect.any(Object))

  // Bad model id (ObjectId)
  await expect(user4.validate({ name: 'badid' })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'Value was not a valid ObjectId.',
    meta: { rule: 'isId', model: 'user4', field: 'name' },
  })
})

test('schema options default', async () => {
  // todo: test objects
  // todo: change test name
  let user = db.model('user', { fields: {
    name: { type: 'string', minLength: 7 },
    email: { type: 'string', isEmail: true },
    amount: { type: 'number' },
  }})
  let user2 = db.model('user', { fields: {
    amount: { type: 'number', required: true },
  }})
  let user3 = db.model('user', { fields: {
    names: { type: 'string', enum: ['Martin', 'Luther'], default: 'Martin' },
  }})

  // MinLength
  await expect(user.validate({ name: 'Martin Luther' })).resolves.toEqual({name: 'Martin Luther'})
  await expect(user.validate({ name: 'Carl' })).rejects.toContainEqual({
    detail: 'Value needs to be at least 7 characters long.',
    status: '400',
    title: 'name',
    meta: {
      model: 'user',
      field: 'name',
      rule: 'minLength',
    },
  })

  // isEmail
  await expect(user.validate({ email: 'good@g.com' })).resolves.toEqual({email: 'good@g.com'})
  await expect(user.validate({ email: 'bad email' })).rejects.toContainEqual({
    detail: 'Please enter a valid email address.',
    status: '400',
    title: 'email',
    meta: {
      model: 'user',
      field: 'email',
      rule: 'isEmail',
    },
  })

  // Enum
  await expect(user3.validate({})).resolves.toEqual({ names: 'Martin' })
  await expect(user3.validate({ names: 'Luther' })).resolves.toEqual({ names: 'Luther' })
  await expect(user3.validate({ names: 'bad name' })).rejects.toContainEqual({
    detail: 'Invalid enum value',
    status: '400',
    title: 'names',
    meta: {
      model: 'user',
      field: 'names',
      rule: 'enum',
    },
  })

  // Number valid
  await expect(user2.validate({ amount: 0 })).resolves.toEqual({ amount: 0 })
  await expect(user2.validate({ amount: '0' })).resolves.toEqual({ amount: 0 })
  await expect(user.validate({ amount: undefined })).resolves.toEqual({})
  await expect(user.validate({ amount: null })).resolves.toEqual({ amount: null })

  // Number required
  let mock1 = {
    detail: 'This field is required.',
    status: '400',
    title: 'amount',
    meta: { model: 'user', field: 'amount', rule: 'required' },
  }
  await expect(user2.validate({})).rejects.toContainEqual(mock1)
  await expect(user2.validate({ amount: '' })).rejects.toContainEqual(mock1)
  await expect(user2.validate({ amount: undefined })).rejects.toContainEqual(mock1)
  await expect(user2.validate({ amount: null })).rejects.toContainEqual(mock1)

  // Number invalid
  let mock2 = {
    detail: 'Value was not a number.',
    status: '400',
    title: 'amount',
    meta: { model: 'user', field: 'amount', rule: 'isNumber' },
  }
  await expect(user.validate({ amount: false })).rejects.toContainEqual(mock2)
  await expect(user.validate({ amount: 'bad' })).rejects.toContainEqual(mock2)
})

test('schema options objects', async () => {
  const db2 = monastery.manager('127.0.0.1/monastery', { nullObjects: true, timestamps: false })
  let user = db2.model('user', {
    fields: {
      location: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        schema: { required: true },
      },
    },
  })
  let requiredError = [{
    'detail': 'This field is required.',
    'meta': {'detailLong': undefined, 'field': 'location', 'model': 'user', 'rule': 'required'},
    'status': '400',
    'title': 'location',
  }]
  // required errors
  await expect(user.validate({ location: null })).rejects.toEqual(requiredError)
  await expect(user.validate({ location: '' })).rejects.toEqual(requiredError)
  await expect(user.validate({ location: undefined })).rejects.toEqual(requiredError)
  // required no error
  await expect(user.validate({ location: {} })).resolves.toEqual({ location: {} })
  db2.close()
})

test('validate defaultObjects', async () => {
  const db2 = monastery.manager('127.0.0.1/monastery', { defaultObjects: true, timestamps: false })
  // let base = { names: [], animals: { dogs: [] }}
  let user = db2.model('user', { fields: {
    name: { type: 'string' },
    names: [{ type: 'string' }],
    animals: {
      dog: { type: 'string' },
      dogs: [{ name: { type: 'string' } }],
    },
  }})

  // Array/subdocument defaults
  await expect(user.validate({})).resolves.toEqual({
    names: [],
    animals: { dogs: [] },
  })
  db2.close()
})

test('validate nullObjects', async () => {
  const db2 = monastery.manager('127.0.0.1/monastery', { nullObjects: true, timestamps: false })
  let user = db2.model('user', { fields: {
    names: [{ type: 'string' }],
    animals: {
      dog: { type: 'string' },
      dogs: [{ name: { type: 'string' } }],
    },
  }})

  // Subdocument data (null/string)
  await expect(user.validate({ animals: 'notAnObject' })).rejects.toEqual([{
    'detail': 'Value was not an object.',
    'meta': {'detailLong': undefined, 'field': 'animals', 'model': 'user', 'rule': 'isObject'},
    'status': '400',
    'title': 'animals',
  }])
  await expect(user.validate({ animals: '', names: null })).resolves.toEqual({ 
    animals: null, names: null, 
  })
  db2.close()
})

test('validation option skipValidation', async () => {
  let user = db.model('user', { fields: {
    name: { type: 'string', required: true },
  }})
  let user2 = db.model('user2', { fields: {
    my: {
      name: {
        is: { type: 'string', required: true },
      },
    },
  }})
  let user3 = db.model('user3', { fields: {
    people: [{
      name: { type: 'string', required: true },
    }],
    people2: [{
      people3: [{
        name: { type: 'string', required: true },
      }],
    }],
  }})
  let user4 = db.model('user4', { fields: {
    code: { type: 'string', required: true },
    address: {
      city: { type: 'string', required: true },
      country: { type: 'string', required: true },
    },
  }})

  // Skip validation on the required fields
  await expect(user.validate({}, { skipValidation: true })).resolves.toEqual({})
  await expect(user.validate({}, { skipValidation: ['name'] })).resolves.toEqual({})
  await expect(user2.validate({}, { skipValidation: ['my.name'] })).resolves.toEqual({})
  await expect(user3.validate({ people: [{}] }, { skipValidation: ['people.name'] }))
    .resolves.toEqual({ people: [{}] })

  // Skip all array items
  await expect(user3.validate(
    { people2: [{ people3: [{}, {}] }] },
    { skipValidation: ['people2.$.people3.$.name'] }
  )).resolves.toEqual({ people2: [{ people3: [{}, {}] }] })

  // Skip all array items (array expanding)
  await expect(user3.validate(
    { people2: [{ people3: [{}, {}] }] },
    { skipValidation: ['people2.people3.name'] }
  )).resolves.toEqual({ people2: [{ people3: [{}, {}] }] })

  // Skip a certain array index
  await expect(user3.validate(
    { people2: [{ people3: [{}, {}] }] },
    { skipValidation: ['people2.$.people3.0.name'] }
  )).rejects.toContainEqual({
    detail: 'This field is required.',
    status: '400',
    title: 'people2.0.people3.1.name',
    meta: {
      field: 'name',
      model: 'user3',
      rule: 'required',
    },
  })

  // Skip multiple fields
  await expect(user4.validate(
    { address: { city: 'christchurch', country: 'ewf' }},
    { skipValidation: ['code'] }
  )).resolves.toEqual({
    address: { city: 'christchurch', country: 'ewf' },
  })

  // Non existing validation field entries
  await expect(user3.validate({ people: [{}] }, { skipValidation: ['people.badField'] })).rejects.toContainEqual({
    detail: 'This field is required.',
    status: '400',
    title: 'people.0.name',
    meta: {
      model: 'user3',
      field: 'name',
      rule: 'required',
    },
  })
})

test('validation option validateUndefined', async () => {
  // ValidateUndefined runs required rules on all fields, `true` for insert, `false` for update.
  let user = db.model('user', { fields: {
    date: { type: 'number' },
    name: { type: 'string', required: true },
  }})
  let usernum = db.model('usernum', { fields: {
    amount: { type: 'number', required: true },
  }})
  let userdeep = db.model('userdeep', { fields: {
    date: { type: 'number' },
    name: {
      first: { type: 'string', required: true },
    },
    names: [{
      first: { type: 'string', required: true },
    }],
  }})
  let errorRequired = {
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: expect.any(Object),
  }

  // Required error for undefined
  await expect(user.validate({}))
    .rejects.toEqual([errorRequired])
  await expect(user.validate({}, { update: true, validateUndefined: true }))
    .rejects.toEqual([errorRequired])
  await expect(userdeep.validate({}))
    .rejects.toEqual([{ ...errorRequired, title: 'name.first' }])
  await expect(userdeep.validate({ name: {} }, { update: true }))
    .rejects.toEqual([{ ...errorRequired, title: 'name.first' }])
  await expect(userdeep.validate({ names: [{}] }, { update: true }))
    .rejects.toEqual([{ ...errorRequired, title: 'names.0.first' }])

  // Required error for null
  await expect(user.validate({ name: null }, { update: true }))
    .rejects.toEqual([errorRequired])
  await expect(usernum.validate({ amount: null }, { update: true }))
    .rejects.toEqual([{ ...errorRequired, title: 'amount' }])
  await expect(user.validate({ name: null }, { update: true, validateUndefined: true }))
    .rejects.toEqual([errorRequired])

  // Skip required error
  await expect(user.validate({ name: undefined }, { validateUndefined: false })).resolves.toEqual({})
  await expect(user.validate({}, { validateUndefined: false })).resolves.toEqual({})
  await expect(user.validate({}, { update: true })).resolves.toEqual({})
  await expect(user.validate({}, { update: true, validateUndefined: false })).resolves.toEqual({})
  await expect(userdeep.validate({}, { update: true })).resolves.toEqual({})
  await expect(userdeep.validate({ name: {} }, { update: true, validateUndefined: false }))
    .resolves.toEqual({ name: {} })
  await expect(userdeep.validate({ names: [{}] }, { update: true, validateUndefined: false }))
    .resolves.toEqual({ names: [{}] })
})

test('validation update dot notation', async () => {
  // Only updates the fields that are passed in the data object, similar to $set. They don't 
  // remove subdocument fields that are not present in the data object.
  const user = db.model('user_partialUpdate1', {
    fields: {
      name: { type: 'string' },
      address: {
        city: { type: 'string' },
        country: { type: 'string' },
      },
    },
  })
  const user2 = db.model('user_partialUpdate2', {
    fields: {
      name: { type: 'string' },
      address: {
        city: { type: 'string' },
        country: { type: 'string', required: true },
      },
      books: [{
        title: { type: 'string', required: true },
        pages: {
          count: { type: 'number', required: true },
        },
      }],
    },
  })

  // Partial validate
  const validated1 = await user.validate({ 
    'address.city': 'Berlin2',
    'address': { city: 'Berlin' }, // preserved
  })
  expect(validated1).toEqual({ 
    'address': { city: 'Berlin' }, 
    'address.city': 'Berlin2',
  })

   /// { partialUpdate: true }

  // Order of fields, normal objects are ordered first
  expect(Object.keys(validated1)).toEqual(['address', 'address.city'])

  // validate (update) throws required error for deep field (as normal)
  await expect(user2.validate({ 'address': { city: 'Berlin' }}, { update: true }))
    .rejects.toEqual(expect.any(Array))

  // validate (update) works with dot notatation paths
  await expect(user2.validate({ 'address.city': 'Berlin2' }, { update: true }))
    .resolves.toEqual({ 'address.city': 'Berlin2' })

  // validate (insert) still throws required errors, even with dot notatation paths
  await expect(user2.validate({ 'address.city': 'Berlin2' }))
    .rejects.toEqual(expect.any(Array))

  // validate (update) works with dot notation array paths, and validates data
  await expect(user2.validate({ 'books.0.pages.count': '1' }, { update: true }))
    .resolves.toEqual({ 'books.0.pages.count': 1 })

  // validate (update) works with positional array paths
  await expect(user2.validate({ 'books.$.pages.count': '2' }, { update: true }))
    .resolves.toEqual({ 'books.$.pages.count': 2 })

  // Non-field dot notation paths removed
  await expect(user2.validate({ 'books.0.badfield': 2 }, { update: true }))
    .resolves.toEqual({})

  // validate (update) should continue on throwing validation errors for dot notation array paths with subdocument values
  await expect(user2.validate({ 'books.$.pages': {} }, { update: true }))
    .rejects.toEqual([{
      'detail': 'This field is required.',
      'meta': { 'detailLong': undefined, 'field': 'count', 'model': 'user_partialUpdate2', 'rule': 'required' },
      'status': '400',
      'title': 'books.$.pages.count',
    }])
})

test('validation hooks and option skipHooks', async () => {
  let user = db.model('user_validation_hooks', {
    fields: {
      first: { type: 'string'},
      last: { type: 'string'},
    },
    beforeValidate: [(data, next) => {
      if (!data.first) {
        next(new Error('beforeValidate error 1..'))
      } else if (!data.last) {
        setTimeout(function() {
          next(new Error('beforeValidate error 2..'))
        }, 100)
      } else {
        next()
      }
    }],
  })
  let userDoc = await user.insert({ data: { first: 'Martin', last: 'Luther' }})

  // Catch validate (a)synchronous errors thrown in function or through `next(err)`
  await expect(user.validate({ first: '' })).rejects.toThrow('beforeValidate error 1..')
  await expect(user.validate({ first: 'Martin' })).rejects.toThrow('beforeValidate error 2..')
  await expect(user.validate({ first: 'Martin' }, { skipHooks: true })).resolves.toEqual({ first: 'Martin' })
  await expect(user.validate({ first: 'Martin', last: 'Luther' })).resolves.toEqual({
    first: 'Martin',
    last: 'Luther',
  })

  // Catch insert (a)synchronous errors thrown in function or through `next(err)`
  await expect(user.insert({ data: { first: '' } })).rejects.toThrow('beforeValidate error 1..')
  await expect(user.insert({ data: { first: 'Martin' } })).rejects.toThrow('beforeValidate error 2..')
  await expect(user.insert({ data: { first: 'Martin' }, skipHooks: true })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin',
  })
  await expect(user.insert({ data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
    _id: expect.any(Object),
    first: 'Martin',
    last: 'Luther',
  })

  // Catch update (a)synchronous errors thrown in function or through `next(err)`
  await expect(user.update({ query: userDoc._id, data: { first: '' } }))
    .rejects.toThrow('beforeValidate error 1..')
  await expect(user.update({ query: userDoc._id, data: { first: 'Martin' } }))
    .rejects.toThrow('beforeValidate error 2..')
  await expect(user.update({ query: userDoc._id, data: { first: 'Martin' }, skipHooks: true }))
    .resolves.toEqual({ first: 'Martin' })
  await expect(user.update({ query: userDoc._id, data: { first: 'Martin', last: 'Luther' } }))
    .resolves.toEqual({
      first: 'Martin',
      last: 'Luther',
    })
})