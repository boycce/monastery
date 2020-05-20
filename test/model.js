module.exports = function(monastery, db) {

  test('Model conflicts', async () => {})

  test('Model setup', async () => {
    //Setup
    let user = db.model('user', { fields: {
      name: { type: 'string' },
      pets: [{ type: 'string' }],
      colors: { red: { type: 'string' } },
      points: [[{ type: 'number' }]],
      points2: [[{ x: { type: 'number' } }]]
    }})

    // Default fields
    expect(db.model('user2').fields).toEqual({
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

  test('Model setup with defaults', async () => {
    // Setup
    let db = monastery(false, { defaults: true })
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

}
