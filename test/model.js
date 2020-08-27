module.exports = function(monastery, db) {

  test('Model conflicts', async () => {})

  test('Model setup', async () => {
    // Setup
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]]
    }})

    // no fields defined
    expect(db.model('user2').fields).toEqual({})

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
    // Need to test and allow index changes i.e. line 110
    let db = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
    let user = db.model('user', {})

    let setupIndex1 = await user._setupIndexes({
      name: { type: 'string', index: 'text' }
    })

    await expect(user._setupIndexes({
      name: { type: 'string', index: 'text' },
      name2: { type: 'string', index: 'text' }
    })).rejects.toEqual(new Error("Index with name: text already exists with different options"))

    db.close()
    done()
  })

}
