let validate = require('../lib/model-validate')

module.exports = function(monastery, opendb) {

  test('Validation basic errors', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      date: { type: 'date' },
      name: { type: 'string', required: true },
      colors: [{ type: 'string' }],
      animals: { dog: { type: 'string' }}
    }})

    // Required error (insert)
    await expect(user.validate({})).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'name' }
    })
    await expect(user.validate({ name : '' }, { ignoreUndefined: true })).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'name' }
    })

    // Required error (insert, and with ignoreRequired)
    await expect(user.validate({}, { ignoreUndefined: true })).resolves.toEqual({})
    await expect(user.validate({}, { ignoreUndefined: true, update: true })).resolves.toEqual({})

    // No required error (update)
    await expect(user.validate({}, { update: true })).resolves.toEqual({})

    // Type error (string)
    await expect(user.validate({ name: 1 })).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'Value was not a string.',
      meta: { rule: 'isString', model: 'user', field: 'name' }
    })

    // Type error (date)
    await expect(user.validate({ name: 'a', date: 'fe' })).rejects.toContainEqual({
      status: '400',
      title: 'date',
      detail: 'Value was not a unix timestamp.',
      meta: { rule: 'isDate', model: 'user', field: 'date' }
    })

    // Type error (array)
    await expect(user.validate({ name: 'a', colors: 1 })).rejects.toContainEqual({
      status: '400',
      title: 'colors',
      detail: 'Value was not an array.',
      meta: { rule: 'isArray', model: 'user', field: 'colors' }
    })

    // Type error (array)
    await expect(user.validate({ name: 'a', colors: null })).rejects.toContainEqual({
      status: '400',
      title: 'colors',
      detail: 'Value was not an array.',
      meta: { rule: 'isArray', model: 'user', field: 'colors' }
    })

    // Type error (object)
    await expect(user.validate({ name: 'a', animals: [] })).rejects.toContainEqual({
      status: '400',
      title: 'animals',
      detail: 'Value was not an object.',
      meta: { rule: 'isObject', model: 'user', field: 'animals' }
    })

    // Type error (object)
    await expect(user.validate({ name: 'a', animals: null })).rejects.toContainEqual({
      status: '400',
      title: 'animals',
      detail: 'Value was not an object.',
      meta: { rule: 'isObject', model: 'user', field: 'animals' }
    })
  })

  test('Validation subdocument errors', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      animals: {
        cat: { type: 'string', required: true },
        dog: {
          name:  { type: 'string' },
          color: { type: 'string', required: true }
        }
      }
    }})

    // Invalid subdocument type
    await expect(user.validate({ animals: { dog: 1 }})).rejects.toContainEqual({
      status: '400',
      title: 'animals.dog',
      detail: 'Value was not an object.',
      meta: { rule: 'isObject', model: 'user', field: 'dog' }
    })

    // Required subdocument property (required on insert)
    await expect(user.validate({})).rejects.toContainEqual({
      status: '400',
      title: 'animals.cat',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'cat' }
    })

    // Required subdocument property (required on insert)
    await expect(user.validate({})).rejects.toContainEqual({
      status: '400',
      title: 'animals.dog.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    })

    // Required subdocument property (required on update when a parent is specified)
    await expect(user.validate({ animals: {} }, { update: true })).rejects.toContainEqual({
      status: '400',
      title: 'animals.cat',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'cat' }
    })

    // Required subdocument property (required on update when a parent is specified)
    await expect(user.validate({ animals: { dog: {}} }, { update: true })).rejects.toContainEqual({
      status: '400',
      title: 'animals.dog.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    })

    // Required subdocument property (required on update when a grand-parent is specified)
    await expect(user.validate({ animals: {} }, { update: true })).rejects.toContainEqual({
      status: '400',
      title: 'animals.dog.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    })

    // Ignore required subdocument property (not required on update)
    await expect(user.validate({}, { update: true })).resolves.toEqual({})

    // Ignore required subdocument property with a defined parent (update) (not required if ignoreUndefined set)
    await expect(user.validate({ animals: {} }, { ignoreUndefined: true })).resolves.toEqual({
      animals: {}
    })

    // Ignore required subdocument property with a defined parent (not required if ignoreUndefined set)
    await expect(user.validate({ animals: {} }, { update: true, ignoreUndefined: true })).resolves.toEqual({
      animals: {}
    })

    // Required subdocument property (defined with ignoreUndefined)
    await expect(user.validate({ animals: { cat: '' }}, { update: true, ignoreUndefined: true })).rejects.toContainEqual({
      status: '400',
      title: 'animals.cat',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'cat' }
    })
  })

  test('Validation array errors', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      animals: {
        cats: [{ type: 'string' }],
        dogs: [{
          name:  { type: 'string' },
          color: { type: 'string', required: true }
        }]
      }
    }})

    // Type error within an array (string)
    await expect(user.validate({
      animals: { cats: [1] }
    })).rejects.toContainEqual({
      status: '400',
      title: 'animals.cats.0',
      detail: 'Value was not a string.',
      meta: { rule: 'isString', model: 'user', field: '0' }
    })

    // Type error within an array subdocument (string)
    let error = {
      status: '400',
      title: 'animals.dogs.0.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    }
    await expect(user.validate({ animals: { dogs: [{ name: 'sparky', color: 1 }] }}))
      .rejects.toContainEqual({
        ...error,
        detail: 'Value was not a string.',
        meta: { rule: 'isString', model: 'user', field: 'color' }
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

    // No undefined item errors with ignoreUndefined
    await expect(user.validate(
      { animals: { dogs: [{ name: 'sparky' }] }},
      { update: true, ignoreUndefined: true }
    ))
      .resolves.toEqual({ animals: { dogs: [{ name: 'sparky' }] }})

    // Requried error within an array subdocument (even during update when parent defined && ignoreUndefined = true)
    await expect(user.validate(
      { animals: { dogs: [{ name: 'sparky', color: '' }] }},
      { update: true, ignoreUndefined: true }
    ))
      .rejects.toContainEqual(error)
  })

  test('Validation getMostSpecificKeyMatchingPath', async () => {
    let fn = validate._getMostSpecificKeyMatchingPath
    let mock = {
      'cats.name': true,
      'cats.name': true,

      'dogs.name': true,
      'dogs.$.name': true,

      'pigs.name': true,
      'pigs.$.name': true,
      'pigs.1.name': true,
      'pigs.2.name': true,

      'gulls.$': true,
      'gulls.$.$': true,
      'gulls.name': true,
      'gulls.$.name': true,
    }
    // subdocument
    expect(fn(mock, 'cats.name')).toEqual('cats.name')
    // array subdocuments
    expect(fn(mock, 'cats.1.name')).toEqual('cats.name')
    expect(fn(mock, 'dogs.1.name')).toEqual('dogs.$.name')
    expect(fn(mock, 'dogs.2.name')).toEqual('dogs.$.name')
    expect(fn(mock, 'pigs.1.name')).toEqual('pigs.1.name')
    expect(fn(mock, 'pigs.2.name')).toEqual('pigs.2.name')
    expect(fn(mock, 'pigs.3.name')).toEqual('pigs.$.name')
    // array
    expect(fn(mock, 'gulls.1.2')).toEqual('gulls.$.$')
    expect(fn(mock, 'gulls.1')).toEqual('gulls.$')
  })

  test('Validation default messages', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string', minLength: 4 },
        dog: { name: { type: 'string', minLength: 4 }},
        dogNames: [{ type: 'string', minLength: 4 }],
        animals: [{
          name: { type: 'string', minLength: 4 }
        }]
      }
    })

    let mock = {
      status: '400',
      title: 'name',
      detail: 'Value needs to be at least 4 characters long.',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    }

    // basic error
    await expect(user.validate({ name: 'ben' })).rejects.toContainEqual(
      mock
    )

    // subdocument error
    await expect(user.validate({ dog: { name: 'ben' } })).rejects.toContainEqual({
      ...mock,
      title: 'dog.name'
    })

    // array error
    await expect(user.validate({ dogNames: ['ben'] })).rejects.toContainEqual({
      ...mock,
      title: 'dogNames.0',
      meta: { ...mock.meta, field: '0' }
    })

    // subdocument in an array error
    await expect(user.validate({ animals: [{ name: 'ben' }] })).rejects.toContainEqual({
      ...mock,
      title: 'animals.0.name'
    })

    // subdocument in an array error (different index)
    await expect(user.validate({ animals: [{ name: 'carla' }, { name: 'ben' }] })).rejects.toContainEqual({
      ...mock,
      title: 'animals.1.name'
    })
  })

  test('Validation custom messages', async () => {
    // Setup
    // Todo: Setup testing for array array subdocument field messages
    let db = (await opendb(false)).db
    let arrayWithSchema = (array, schema) => { array.schema = schema; return array }
    let user = db.model('user', {
      fields: {
        name: { type: 'string', minLength: 4 },
        dog: { name: { type: 'string', minLength: 4 }},
        dogNames: [{ type: 'string', minLength: 4 }],
      },
      messages: {
        'name': { minLength: 'Oops min length is 4' },
        'dog.name': { minLength: 'Oops min length is 4' },
        'dogNames': { minLength: 'Oops min length is 4' },
      }
    })

    let mock = {
      status: '400',
      title: 'name',
      detail: 'Oops min length is 4',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    }

    // basic error
    await expect(user.validate({ name: 'ben' })).rejects.toContainEqual(
      mock
    )
    // subdocument error
    await expect(user.validate({ dog: { name: 'ben' } })).rejects.toContainEqual({
      ...mock,
      title: 'dog.name'
    })
    // array error
    await expect(user.validate({ dogNames: ['ben'] })).rejects.toContainEqual({
      ...mock,
      title: 'dogNames.0',
      meta: { ...mock.meta, field: '0' }
    })
  })

  test('Validation custom messages for arrays', async () => {
    // Setup
    // Todo: Setup testing for array array subdocument field messages
    let db = (await opendb(false)).db
    let arrayWithSchema = (array, schema) => { array.schema = schema; return array }
    let user = db.model('user', {
      fields: {
        dogNames: arrayWithSchema([
          arrayWithSchema([{ type: 'string' }], { minLength: 1 })
        ], { minLength: 1 }),
        catNames: [{
          name: { type: 'string', minLength: 4 }
        }],
        pigNames: [[{
          name: { type: 'string', minLength: 4 },
        }]],
      },
      messages: {
        'dogNames': { minLength: 'add one dog name' },
        'dogNames.$': { minLength: 'add one sub dog name' },

        'catNames.name': { minLength: 'min length error (name)' },
        'catNames.1.name': { minLength: 'min length error (1)' },
        'catNames.2.name': { minLength: 'min length error (2)' },

        'pigNames.name': { minLength: 'min length error (name)' },
        'pigNames.$.name': { minLength: 'min length error ($)' },
        'pigNames.1.name': { minLength: 'min length error (1)' },
        'pigNames.2.name': { minLength: 'min length error (2)' },
        'pigNames.0.2.name': { minLength: 'min length error (deep 0 2)' },
        'pigNames.$.2.name': { minLength: 'min length error (deep $ 2)' },
      }
    })

    // Empty array
    await expect(user.validate({ dogNames: [] })).rejects.toContainEqual({
      status: '400',
      title: 'dogNames',
      detail: 'add one dog name',
      meta: { rule: 'minLength', model: 'user', field: 'dogNames' }
    })
    // Empty sub array
    await expect(user.validate({ dogNames: [['carla']] })).resolves.toEqual({ dogNames: [['carla']] })
    await expect(user.validate({ dogNames: [[]] })).rejects.toContainEqual({
      status: '400',
      title: 'dogNames.0',
      detail: 'add one sub dog name',
      meta: { rule: 'minLength', model: 'user', field: '0' }
    })


    // array-subdocument-field error (loose match)
    await expect(user.validate({ catNames: [{ name: 'ben' }] })).rejects.toContainEqual({
      status: '400',
      title: 'catNames.0.name',
      detail: 'min length error (name)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-1-field error
    await expect(user.validate({ catNames: [{ name: 'carla' }, { name: 'ben' }] })).rejects.toContainEqual({
      status: '400',
      title: 'catNames.1.name',
      detail: 'min length error (1)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-2-field error
    await expect(user.validate({ catNames: [{ name: 'carla' }, { name: 'carla' }, { name: 'ben' }] })).rejects.toContainEqual({
      status: '400',
      title: 'catNames.2.name',
      detail: 'min length error (2)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })


    // array-subdocument-field error (loose $ match)
    await expect(user.validate({ pigNames: [[{ name: 'ben' }]] })).rejects.toContainEqual({
      status: '400',
      title: 'pigNames.0.0.name',
      detail: 'min length error ($)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-1-field error
    await expect(user.validate({ pigNames: [[{ name: 'carla' }, { name: 'ben' }]] })).rejects.toContainEqual({
      status: '400',
      title: 'pigNames.0.1.name',
      detail: 'min length error (1)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-0-2-field error
    await expect(user.validate({ pigNames: [[{ name: 'carla' }, { name: 'carla' }, { name: 'ben' }]] })).rejects.toContainEqual({
      status: '400',
      title: 'pigNames.0.2.name',
      detail: 'min length error (deep 0 2)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-2-0-field error (fallback)
    await expect(user.validate({ pigNames: [[],[],[{ name: 'carla' },{ name: 'carla' },{ name: 'ben' }]] })).rejects.toContainEqual({
      status: '400',
      title: 'pigNames.2.2.name',
      detail: 'min length error (deep $ 2)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
    // array-subdocument-2-0-field error (lower fallback)
    await expect(user.validate({ pigNames: [[],[],[{ name: 'ben' }]] })).rejects.toContainEqual({
      status: '400',
      title: 'pigNames.2.0.name',
      detail: 'min length error (2)',
      meta: { rule: 'minLength', model: 'user', field: 'name' }
    })
  })

  test('Validation custom rules', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', {
      fields: {
        name: { type: 'string', bigName: 8 },
        animals: [{
          name: { type: 'string', bigName: 8 }
        }]
      },
      rules: {
        bigName: function(value, ruleArg) {
          return value.length >= ruleArg
        }
      }
    })

    // Basic field
    await expect(user.validate({ name: 'benjamin' })).resolves.toEqual({ name: 'benjamin' })
    await expect(user.validate({ name: 'ben' })).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'Invalid data property for rule "bigName".',
      meta: { rule: 'bigName', model: 'user', field: 'name' }
    })

    // subdocument in an array
    await expect(user.validate({ animals: [{ name: 'benjamin' }] })).resolves.toEqual({ animals: [{ name: 'benjamin' }] })
    await expect(user.validate({ animals: [{ name: 'ben' }] })).rejects.toContainEqual({
      status: '400',
      title: 'animals.0.name',
      detail: 'Invalid data property for rule "bigName".',
      meta: { rule: 'bigName', model: 'user', field: 'name' }
    })
  })

  test('Validated data', async () => {
    // Setup
    let db = (await opendb(false)).db
    let fields = {
      name: { type: 'string' },
      names: [{ type: 'string' }],
      animals: {
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }]
      }
    }
    fields.names.schema = { nullObject: true }
    fields.animals.schema = { nullObject: true }
    let user = db.model('user', { fields: fields })

    // No data
    await expect(user.validate({})).resolves.toEqual({})

    // Ignores invalid data
    await expect(user.validate({ badprop: true, schema: {} })).resolves.toEqual({})

    // Allows null data
    await expect(user.validate({ name: null })).resolves.toEqual({ name: null })

    // String data
    await expect(user.validate({ name: 'Martin Luther' })).resolves.toEqual({ name: 'Martin Luther' })

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

    // Subdocument property data (bad data)
    await expect(user.validate({ animals: { dog: 'sparky', cat: 'grumpy' } }))
      .resolves.toEqual({ animals: { dog: 'sparky' } })

    // Subdocument -> array -> subdocument data
    await expect(user.validate({ animals: { dogs: [{ name: 'sparky' }] }}))
      .resolves.toEqual({ animals: { dogs: [{ name: 'sparky' }] }})

    // Subdocument -> array -> subdocument data (empty)
    await expect(user.validate({ animals: { dogs: [{}] }}))
      .resolves.toEqual({ animals: { dogs: [{}] }})
  })

  test('Schema options', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      name: { type: 'string', 'insertOnly': true }
    }})
    let user2 = db.model('user2', { fields: {
      name: { type: 'string', defaultOverride: true, default: 'Martin Luther' }
    }})
    let user3 = db.model('user3', { fields: {}})
    let user4 = db.model('user4', { fields: {
      name: { model: true }
    }})

    // Ignore insertOnly fields when updating
    await expect(user.validate({ name: 'Martin Luther' }, { update: true })).resolves.toEqual({})

    // Default
    await expect(user2.validate({})).resolves.toEqual({ name: 'Martin Luther' })

    // Default override
    await expect(user2.validate({ name : 'temp' })).resolves.toEqual({ name: 'Martin Luther' })

    // Index, mongodb connection error
    await expect(user3._setupIndexes({ name: { type: 'string', index: 'text' }})).rejects
      .toEqual({ type: "info", detail: "Skipping createIndex on the 'user3' model, no mongodb connection found." })

    // Model id (Monk ObjectId)
    let data = await user4.validate({ name: "5d4356299d0f010017602f6b" })
    await expect(data.name.toString()).toEqual(db.id("5d4356299d0f010017602f6b").toString())
    await expect(data.name).toEqual(expect.any(Object))

    // Bad model id (Monk ObjectId)
    await expect(user4.validate({ name: 'badid' })).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'Value was not a valid ObjectId.',
      meta: { rule: 'isId', model: 'user4', field: 'name' }
    })
  })

  test('Schema default rules', async () => {
    // Setup
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      name: { type: 'string', minLength: 7 },
      email: { type: 'string', isEmail: true },
      names: { type: 'string', enum: ['Martin', 'Luther'] },
      amount: { type: 'number' },
    }})
    let user2 = db.model('user', { fields: {
      amount: { type: 'number', required: true },
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
        rule: 'minLength'
      }
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
        rule: 'isEmail'
      }
    })

    // Enum
    await expect(user.validate({ names: 'Martin' })).resolves.toEqual({ names: 'Martin' })
    await expect(user.validate({ names: 'bad name' })).rejects.toContainEqual({
      detail: 'Invalid enum value',
      status: '400',
      title: 'names',
      meta: {
        model: 'user',
        field: 'names',
        rule: 'enum'
      }
    })

    // Number valid
    await expect(user2.validate({ amount: 0 })).resolves.toEqual({ amount: 0 }) // required
    await expect(user.validate({ amount: '0' })).resolves.toEqual({ amount: 0 }) // required
    await expect(user.validate({ amount: undefined })).resolves.toEqual({})  // not required
    await expect(user.validate({ amount: null })).resolves.toEqual({ amount: null }) // not required

    // Number required
    let mock1 = {
      detail: 'This field is required.',
      status: '400',
      title: 'amount',
      meta: { model: 'user', field: 'amount', rule: 'required' }
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
      meta: { model: 'user', field: 'amount', rule: 'isNumber' }
    }
    await expect(user.validate({ amount: false })).rejects.toContainEqual(mock2)
    await expect(user.validate({ amount: 'bad' })).rejects.toContainEqual(mock2)
  })

  test('Schema default objects', async (done) => {
    let db = (await opendb(null, {
      timestamps: false,
      defaultObjects: true,
      serverSelectionTimeoutMS: 2000
    })).db

    let base = { names: [], animals: { dogs: [] }}
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      names: [{ type: 'string' }],
      animals: {
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }]
      }
    }})

    // Array/subdocument defaults
    await expect(user.validate({})).resolves.toEqual({
      names: [],
      animals: { dogs: [] }
    })

    db.close()
    done()
  })

  test('Schema nullObjects', async (done) => {
    let db = (await opendb(null, {
      timestamps: false,
      nullObjects: true,
      serverSelectionTimeoutMS: 2000
    })).db
    let user = db.model('user', { fields: {
      names: [{ type: 'string' }],
      animals: {
        dog: { type: 'string' },
        dogs: [{ name: { type: 'string' } }]
      }
    }})

    // Subdocument data (null/string)
    await expect(user.validate({ animals: '', names: null })).resolves.toEqual({ animals: null, names: null })

    db.close()
    done()
  })

  test('Validation options', async () => {
    let db = (await opendb(false)).db
    let user = db.model('user', { fields: {
      name: { type: 'string', required: true }
    }})
    let user2 = db.model('user2', { fields: {
      my: {
        name: {
          is: { type: 'string', required: true }
        }
      }
    }})
    let user3 = db.model('user3', { fields: {
      people: [{
        name: { type: 'string', required: true }
      }],
      people2: [{
        people3: [{
          name: { type: 'string', required: true }
        }]
      }]
    }})
    let user4 = db.model('user4', { fields: {
      code: { type: 'string', required: true },
      address: {
        city: { type: 'string', required: true },
        country: { type: 'string', required: true }
      }
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
      detail: "This field is required.",
      status: "400",
      title: "people2.0.people3.1.name",
      meta: {
        field: "name",
        model: "user3",
        rule: "required"
      }
    })

    // Skip multiple fields
    await expect(user4.validate(
      { address: { city: 'christchurch', country: 'ewf' }},
      { skipValidation: ['code'] }
    )).resolves.toEqual({
      address: { city: 'christchurch', country: 'ewf' }
    })

    // Non existing validation field entries
    await expect(user3.validate({ people: [{}] }, { skipValidation: ['people.badField'] })).rejects.toContainEqual({
      detail: "This field is required.",
      status: "400",
      title: "people.0.name",
      meta: {
        model: "user3",
        field: "name",
        rule: "required"
      }
    })
  })

  test('Validation hooks', async (done) => {
    let db = (await opendb(null)).db
    let user = db.model('user', {
      fields: {
        first: { type: 'string'},
        last: { type: 'string'}
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
    await expect(user.validate({ first: '' })).rejects.toThrow(`beforeValidate error 1..`)
    await expect(user.validate({ first: 'Martin' })).rejects.toThrow(`beforeValidate error 2..`)
    await expect(user.validate({ first: 'Martin', last: 'Luther' })).resolves.toEqual({
      first: 'Martin',
      last: 'Luther'
    })

    // Catch insert (a)synchronous errors thrown in function or through `next(err)`
    await expect(user.insert({ data: { first: '' } })).rejects.toThrow(`beforeValidate error 1..`)
    await expect(user.insert({ data: { first: 'Martin' } })).rejects.toThrow(`beforeValidate error 2..`)
    await expect(user.insert({ data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
      _id: expect.any(Object),
      first: 'Martin',
      last: 'Luther'
    })

    // Catch update (a)synchronous errors thrown in function or through `next(err)`
    await expect(user.update({ query: userDoc._id, data: { first: '' } })).rejects.toThrow(`beforeValidate error 1..`)
    await expect(user.update({ query: userDoc._id, data: { first: 'Martin' } })).rejects.toThrow(`beforeValidate error 2..`)
    await expect(user.update({ query: userDoc._id, data: { first: 'Martin', last: 'Luther' } })).resolves.toEqual({
      first: 'Martin',
      last: 'Luther'
    })

    db.close()
    done()
  })

}
