/** 
 * Todo:
 *   - Test custom model rules
 *   - Test custom messages
 *   - Test for index and unique schema fields
 * Notes:
 *   - expect().toEqual:  strict deep match
 *   - expect().toMatchObject:  recevied object can have random properties
 *   - expect.objectContaining:  
 */

let monastery = require('../lib/index.js')
monastery.log = () => {}

test('Model setup', () => {
  // Setup
  let user = monastery.model('user', { fields: {
    name: { type: 'string' },
    pets: [{ type: 'string' }],
    colors: { red: { type: 'string' } },
    points: [[{ type: 'number' }]],
    points2: [[{ x: { type: 'number' } }]]
  }})

  // Default fields
  expect(monastery.model('user').fields).toEqual({
    createdAt: {
      default: expect.any(Function),
      defaultOverride: true,
      insertOnly: true,
      isInteger: true,
      type: "integer"
    },
    updatedAt: {
      default: expect.any(Function),
      defaultOverride: true,
      isInteger: true,
      type: "integer"
    }
  })

  // Has model name
  expect(user.name).toEqual('user')
  
  // Basic field
  expect(user.fields.name).toEqual({ type: 'string', isString: true })

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

test('Validation basic errors', async () => {
  // Setup
  let user = monastery.model('user', { fields: {
    name: { type: 'string', required: true },
    colors: [{ type: 'string' }],
    animals: { dog: { type: 'string' }}
  }})

  // Required error
  await expect(user.validate({})).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', path: 'name' }
  })

  // Type error (string)
  await expect(user.validate({ name: 1 })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'Value was not a string.',
    meta: { rule: 'isString', model: 'user', path: 'name' }
  })

  // Type error (array)
  await expect(user.validate({ colors: 1 })).rejects.toContainEqual({
    status: '400',
    title: 'colors',
    detail: 'Value was not an array.',
    meta: { rule: 'isArray', model: 'user', path: 'colors' }
  })

  // Type error (object)
  await expect(user.validate({ animals: [] })).rejects.toContainEqual({
    status: '400',
    title: 'animals',
    detail: 'Value was not an object.',
    meta: { rule: 'isObject', model: 'user', path: 'animals' }
  })
})

test('Validation subdocument errors', async () => {
  // Setup
  let user = monastery.model('user', { fields: {
    animals: {
      dog: {
        name:  { type: 'string' },
        color: { type: 'string', required: true }
      }
    }
  }})

  // Invalid subdocument type
  await expect(user.validate({ animals: { dog: 1 }})).rejects.toContainEqual({
    status: '400',
    title: 'dog',
    detail: 'Value was not an object.',
    meta: { rule: 'isObject', model: 'user', path: 'animals.dog' }
  })

  // Required subdocument property (implicit insert)
  await expect(user.validate({})).rejects.toContainEqual({
    status: '400',
    title: 'color',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', path: 'animals.dog.color' }
  })

  // Ignore required subdocument property (explicit update option)
  await expect(user.validate({}, { update: true })).resolves.toEqual({})
})

test('Validation array errors', async () => {
  // Setup
  let user = monastery.model('user', { fields: {
    animals: {
      dogs: [{
        name:  { type: 'string' },
        color: { type: 'string', required: true }
      }]
    }
  }})

  // Type error within an array (string)
  await expect(user.validate({
    animals: { dogs: [{ name: 'sparky', color: 1 }] }
  })).rejects.toContainEqual({
    status: '400',
    title: 'color',
    detail: 'Value was not a string.',
    meta: { rule: 'isString', model: 'user', path: 'animals.dogs.0.color' }
  })

  // Requried error within an array
  await expect(user.validate({
    animals: { dogs: [{ name: 'sparky' }] }
  })).rejects.toContainEqual({
    status: '400',
    title: 'color',
    detail: 'This field is required.',
    meta: { rule: 'required', model: 'user', path: 'animals.dogs.0.color' }
  })

  // No item errors for empty arrays
  await expect(user.validate({ animals: { dogs: [] }})).resolves.toEqual({ animals: { dogs: [] }})
})

test('Validated data', async () => {
  // Setup
  let user = monastery.model('user', { fields: {
    name: { type: 'string' },
    names: [{ type: 'string' }],
    animals: { 
      dog: { type: 'string' },
      dogs: [{ name: { type: 'string' } }]
    }
  }})

  // No data
  await expect(user.validate({})).resolves.toEqual({})

  // Ignores invalid data
  await expect(user.validate({ badprop: true })).resolves.toEqual({})

  // String data
  await expect(user.validate({ name: 'Ip Man' })).resolves.toEqual({ name: 'Ip Man' })

  // Array data
  await expect(user.validate({ names: ['blue'] })).resolves.toEqual({ names: ['blue'] })

  // Array data (empty)
  await expect(user.validate({ names: [] })).resolves.toEqual({ names: [] })

  // Subdocument data
  await expect(user.validate({ animals: { dog: 'sparky' } })).resolves.toEqual({ animals: { dog: 'sparky' } })

  // Subdocument data (empty)
  await expect(user.validate({ animals: {} })).resolves.toEqual({ animals: {} })

  // Subdocument data (null)
  await expect(user.validate({ animals: { dog: null }})).resolves.toEqual({ animals: { dog: null }})

  // Subdocument data (bad data)
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
  let user = monastery.model('user', { fields: {
    name: { type: 'string', 'insertOnly': true }
  }})
  let user2 = monastery.model('user2', { fields: {
    name: { type: 'string', defaultOverride: true, default: 'Ip Man' }
  }})
  let user3 = monastery.model('user3', { fields: {
    name: { model: true }
  }})

  // Ignore insertOnly fields when updating
  await expect(user.validate({ name: 'Ip Man' }, { update: true })).resolves.toEqual({})

  // Default 
  await expect(user2.validate({})).resolves.toEqual({ name: 'Ip Man' })

  // Default override
  await expect(user2.validate({ name : 'temp' })).resolves.toEqual({ name: 'Ip Man' })

  // Index, mongodb connection error
  await expect(monastery.setupModelIndexes('user', { name: { type: 'string', index: 'text' }})).rejects
    .toEqual("Skipping createIndex on the 'user' model, no connection assigned to this.db.")

  // Check mongodb connection is set when using `type: 'isId'` or `model: true`. This is because 
  // we need the monastery.db.id() fn.
  await expect(user3.validate({ name: '5d4356299d0f010017602f6b' })).rejects.toContainEqual({
    status: '400',
    title: 'name',
    detail: 'Value was not a valid ObjectId.',
    meta: { rule: 'isId', model: 'user3', path: 'name' }
  })
})
