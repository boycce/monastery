const util = require('../lib/util.js')
const monastery = require('../lib/index.js')

test('util > parseDotNotation', async () => {
  const input = {
    'name': 'Martin',
    'deep.companyLogo1': 'a',
    // not dot notation
    'specialInstructions': [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    // Fields below are not dot notation, but should still be kept, in order.
    'specialInstructions[0][text]': 'filler',
    'specialInstructions[0][createdAt]': 1653601752472,
    'specialInstructions[0][updatedByName]': 'Paul',
    'specialInstructions[0][importance]': 'low',
    // should override above
    'deep': {
      companyLogo2: 'b',
      companyLogo3: 'b',
    },
    // should be added into above
    'deep.companyLogo3': 'c',
    'deep.companyLogos.0.logo': 'd',
    'deep.companyLogos.1.logo': 'e',
    'deep.companyLogos.2': 'f',
  }
  const output = {
    name: 'Martin',
    deep: { // object first seen here
      companyLogo2: 'b',
      companyLogo3: 'c',
      companyLogos: [{ logo: 'd' }, { logo: 'e' }, 'f'],
    },
    specialInstructions: [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    'specialInstructions[0][text]': 'filler',
    'specialInstructions[0][createdAt]': 1653601752472,
    'specialInstructions[0][updatedByName]': 'Paul',
    'specialInstructions[0][importance]': 'low',
  }

  // parseDotNotation output
  expect(util.parseDotNotation(input)).toEqual(output)

  // expected order of keys
  expect(Object.keys(output)).toEqual([
    'name',
    'deep',
    'specialInstructions',
    'specialInstructions[0][text]',
    'specialInstructions[0][createdAt]',
    'specialInstructions[0][updatedByName]',
    'specialInstructions[0][importance]',
  ])

})

test('util > parseBracketNotation', async () => {
  const input = {
    'name': 'Martin',
    // 'pets[]': '', // <-- no longer supported
    'deep[companyLogo1]': 'a',
    // not dot notation
    'specialInstructions': [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    // Fields below are not bracket notation, but should still be kept, in order.
    'specialInstructions.0.text': 'filler',
    'specialInstructions.0.createdAt': 1653601752472,
    'specialInstructions.0.updatedByName': 'Paul',
    'specialInstructions.0.importance': 'low',
    // should override above
    'deep': {
      companyLogo2: 'b',
      companyLogo3: 'b',
    },
    // should be added into above
    'deep[companyLogo3]': 'c',
    'deep[companyLogos][0][logo]': 'd',
    'deep[companyLogos][1][logo]': 'e',
    'deep[companyLogos][2]': 'f',
  }
  const output = {
    name: 'Martin',
    // pets: expect.any(Array),
    deep: { // object first seen here
      companyLogo2: 'b',
      companyLogo3: 'c',
      companyLogos: [{ logo: 'd' }, { logo: 'e' }, 'f'],
    },
    specialInstructions: [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    'specialInstructions.0.text': 'filler',
    'specialInstructions.0.createdAt': 1653601752472,
    'specialInstructions.0.updatedByName': 'Paul',
    'specialInstructions.0.importance': 'low',
  }

  // parseBracketNotation output
  expect(util.parseBracketNotation(input)).toEqual(output)

  // expected order of keys
  expect(Object.keys(output)).toEqual([
    'name',
    'deep',
    'specialInstructions',
    'specialInstructions.0.text',
    'specialInstructions.0.createdAt',
    'specialInstructions.0.updatedByName',
    'specialInstructions.0.importance',
  ])

  expect(() => util.parseBracketNotation({ 'users[][\'name\']': 'Martin' })).toThrow(
    'Monastery: Array items in bracket notation need array indexes "users[][\'name\']", e.g. users[0][name]'
  )
})

test('util > parseBracketToDotNotation', async () => {
  const input = {
    'name': 'Martin',
    'deep[companyLogo1]': 'a',
    // not dot notation
    'specialInstructions': [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    // Fields below are not bracket notation, but should still be kept, in order.
    'specialInstructions.0.text': 'filler',
    'specialInstructions.0.createdAt': 1653601752472,
    'specialInstructions.0.updatedByName': 'Paul',
    'specialInstructions.0.importance': 'low',
    // should NOT override above
    'deep': {
      companyLogo2: 'b',
      companyLogo3: 'b',
    },
    // should NOT be added into above
    'deep[companyLogo3]': 'c',
    'deep[companyLogos][0][logo]': 'd',
    'deep[companyLogos][1][logo]': 'e',
    'deep[companyLogos][2]': 'f',
  }
  const output = {
    name: 'Martin',
    'deep.companyLogo1': 'a',
    specialInstructions: [
      {
        text: 'POD added by driver',
        createdAt: 1653603212886,
        updatedByName: 'Paul Driver 3',
        importance: 'low',
      }, {
        text: 'filler',
        createdAt: 1653601752472,
        updatedByName: 'Paul',
        importance: 'low',
      },
    ],
    'specialInstructions.0.text': 'filler',
    'specialInstructions.0.createdAt': 1653601752472,
    'specialInstructions.0.updatedByName': 'Paul',
    'specialInstructions.0.importance': 'low',
    'deep': {
      companyLogo2: 'b',
      companyLogo3: 'b',
    },
    'deep.companyLogo3': 'c',
    'deep.companyLogos.0.logo': 'd',
    'deep.companyLogos.1.logo': 'e',
    'deep.companyLogos.2': 'f',
  }

  // parseBracketToDotNotation output
  expect(util.parseBracketToDotNotation(input)).toEqual(output)

  // expected order of keys
  expect(Object.keys(output)).toEqual([
    'name',
    'deep.companyLogo1',
    'specialInstructions',
    'specialInstructions.0.text',
    'specialInstructions.0.createdAt',
    'specialInstructions.0.updatedByName',
    'specialInstructions.0.importance',
    'deep',
    'deep.companyLogo3',
    'deep.companyLogos.0.logo',
    'deep.companyLogos.1.logo',
    'deep.companyLogos.2',
  ])

  expect(() => util.parseBracketToDotNotation({ 'users[][\'name\']': 'Martin' })).toThrow(
    'Monastery: Array items in bracket notation need array indexes "users[][\'name\']", e.g. users[0][name]'
  )
})

test('util > isId', async () => {
  expect(util.isId('')).toEqual(false)
  expect(util.isId(1234)).toEqual(false)
  expect(util.isId('1234')).toEqual(false)
  expect(util.isId(null)).toEqual(false)
  expect(util.isId({})).toEqual(false)
  expect(util.isId(['5ff50fe955da2c00170de734'])).toEqual(false)
  expect(util.isId('5ff50fe955da2c00170de734')).toEqual(true)
  expect(util.isId(monastery.id())).toEqual(true)
})

test('util > isHex24', async () => {
  expect(util.isHex24('')).toEqual(false)
  expect(util.isHex24(1234)).toEqual(false)
  expect(util.isHex24('1234')).toEqual(false)
  expect(util.isHex24(null)).toEqual(false)
  expect(util.isHex24({})).toEqual(false)
  expect(util.isHex24(['5ff50fe955da2c00170de734'])).toEqual(false)
  expect(util.isHex24('5ff50fe955da2c00170de734')).toEqual(true)
  expect(util.isHex24(monastery.id())).toEqual(true)
})


test('util > arrayWithSchema', async () => {
  let res = monastery.arrayWithSchema([{ name: { type: 'string' }}], { minLength: 1 })
  expect(res).toContainEqual({ name: { type: 'string' }})
  expect(res.schema).toEqual({ minLength: 1 })
})

// --- ids ------------------------------


test('id > to string', () => {
  const oid = util.id('4ee0fd75d6bd52107c000118')
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('id > id id string', () => {
  const oid = util.id(util.id('4ee0fd75d6bd52107c000118'))
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('id > new', () => {
  const oid = util.id()
  expect(typeof oid.toHexString()).toBe('string')
})

// --- cast -----------------------------

test('cast > should cast ids inside $and', () => {
  const cast = util.cast({ $and: [{ _id: '4ee0fd75d6bd52107c000118' }] })
  const oid = util.id(cast.$and[0]._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $nor', () => {
  const cast = util.cast({ $nor: [{ _id: '4ee0fd75d6bd52107c000118' }] })
  const oid = util.id(cast.$nor[0]._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $not queries', () => {
  const cast = util.cast({ $not: { _id: '4ee0fd75d6bd52107c000118' } })
  const oid = util.id(cast.$not._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $ne queries', () => {
  const cast = util.cast({ _id: { $ne: '4ee0fd75d6bd52107c000118' } })
  const oid = util.id(cast._id.$ne)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $in queries', () => {
  const cast = util.cast({ _id: { $in: ['4ee0fd75d6bd52107c000118'] } })
  const oid = util.id(cast._id.$in[0])
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $nin queries', () => {
  const cast = util.cast({ _id: { $nin: ['4ee0fd75d6bd52107c000118'] } })
  const oid = util.id(cast._id.$nin[0])
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $set queries', () => {
  const cast = util.cast({ $set: { _id: '4ee0fd75d6bd52107c000118' } })
  const oid = util.id(cast.$set._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast ids inside $or', () => {
  const cast = util.cast({ $or: [{ _id: '4ee0fd75d6bd52107c000118' }] })
  const oid = util.id(cast.$or[0]._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should cast nested ids', () => {
  const cast = util.cast({ $pull: { items: [{ _id: '4ee0fd75d6bd52107c000118' }] } })
  const oid = util.id(cast.$pull.items[0]._id)
  expect(oid.toHexString()).toBe('4ee0fd75d6bd52107c000118')
})

test('cast > should not fail when casting 0', () => {
  const cast = util.cast(0)
  expect(cast).toBe(0)
})

test('cast > should not fail when casting null', () => {
  const cast = util.cast(null)
  expect(cast).toBe(null)
})


