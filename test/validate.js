module.exports = function(monastery, db) {

  test('Validation basic errors', async () => {
    // Setup
    let user = db.model('user', { fields: {
      name: { type: 'string', required: true },
      colors: [{ type: 'string' }],
      animals: { dog: { type: 'string' }}
    }})

    // Required error
    await expect(user.validate({})).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'name' }
    })

    // Type error (string)
    await expect(user.validate({ name: 1 })).rejects.toContainEqual({
      status: '400',
      title: 'name',
      detail: 'Value was not a string.',
      meta: { rule: 'isString', model: 'user', field: 'name' }
    })

    // Type error (array)
    await expect(user.validate({ colors: 1 })).rejects.toContainEqual({
      status: '400',
      title: 'colors',
      detail: 'Value was not an array.',
      meta: { rule: 'isArray', model: 'user', field: 'colors' }
    })

    // Type error (object)
    await expect(user.validate({ animals: [] })).rejects.toContainEqual({
      status: '400',
      title: 'animals',
      detail: 'Value was not an object.',
      meta: { rule: 'isObject', model: 'user', field: 'animals' }
    })
  })

  test('Validation subdocument errors', async () => {
    // Setup
    let user = db.model('user', { fields: {
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
      title: 'animals.dog',
      detail: 'Value was not an object.',
      meta: { rule: 'isObject', model: 'user', field: 'dog' }
    })

    // Required subdocument property (implicit insert)
    await expect(user.validate({})).rejects.toContainEqual({
      status: '400',
      title: 'animals.dog.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    })

    // Ignore required subdocument property (explicit update option)
    await expect(user.validate({}, { update: true })).resolves.toEqual({})
  })

  test('Validation array errors', async () => {
    // Setup
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
    await expect(user.validate({
      animals: { dogs: [{ name: 'sparky', color: 1 }] }
    })).rejects.toContainEqual({
      status: '400',
      title: 'animals.dogs.0.color',
      detail: 'Value was not a string.',
      meta: { rule: 'isString', model: 'user', field: 'color' }
    })

    // Requried error within an array subdocument
    await expect(user.validate({
      animals: { dogs: [{ name: 'sparky' }] }
    })).rejects.toContainEqual({
      status: '400',
      title: 'animals.dogs.0.color',
      detail: 'This field is required.',
      meta: { rule: 'required', model: 'user', field: 'color' }
    })

    // No item errors for empty arrays
    await expect(user.validate({ animals: { dogs: [] }}))
      .resolves.toEqual({ animals: { dogs: [] }})
  })

  test('Validated data', async () => {
    // Setup
    let user = db.model('user', { fields: {
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

    // Subdocument data (null)
    await expect(user.validate({ animals: { dog: null }}))
      .resolves.toEqual({ animals: { dog: null }})

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
      .toEqual("Skipping createIndex on the 'user3' model, no mongodb connection found.")

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

  test('Schema rules', async () => {
    // Setup
    let user = db.model('user', { fields: {
      name: { type: 'string', minLength: 7 },
      email: { type: 'string', isEmail: true }
    }})

    // MinLength
    await expect(user.validate({ name: 'Martin Luther' })).resolves.toEqual({"name": "Martin Luther"})
    await expect(user.validate({ name: 'Carl' })).rejects.toContainEqual({
      detail: "Value needs to be at least 7 characters long.",
      status: "400",
      title: "name",
      meta: {
        model: "user",
        field: "name",
        rule: "minLength"
      }
    })

    // isEmail
    await expect(user.validate({ email: 'good@g.com' })).resolves.toEqual({"email": "good@g.com"})
    await expect(user.validate({ email: 'bad email' })).rejects.toContainEqual({
      detail: "Please enter a valid email address.",
      status: "400",
      title: "email",
      meta: {
        model: "user",
        field: "email",
        rule: "isEmail"
      }
    })
  })

  test('Schema defaults', async (done) => {
    let db = monastery('localhost/monastery', { defaults: true })
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
}
