const util = require('../lib/util.js')
const monastery = require('../lib/index.js')

test('util > formdata', async () => {
  expect(await util.parseFormData({
    'name': 'Martin',
    'pets[]': '',
    'deep[companyLogo]': 'a',
    'deep[companyLogos][0]': 'b',
    'deep[companyLogos2][0][logo]':'c',
    'deep[companyLogos2][1][logo]': '',
    'users[0][first]': 'Martin',
    'users[0][last]': 'Luther',
    'users[1][first]': 'Bruce',
    'users[1][last]': 'Lee',
  })).toEqual({
    name: 'Martin',
    pets: expect.any(Array),
    deep: {
      companyLogo: 'a',
      companyLogos: ['b'],
      companyLogos2: [{ logo: 'c' }, { logo: '' }],
    },
    users: [
      { 'first': 'Martin', 'last': 'Luther' },
      { 'first': 'Bruce', 'last': 'Lee' },
    ],
  })
  expect(() => util.parseFormData({ 'users[][\'name\']': 'Martin' })).toThrow(
    'Monastery: Array items in bracket notation need array indexes "users[][\'name\']", e.g. users[0][name]'
  )
})

test('util > isId', async () => {
  expect(util.isId('')).toEqual(false)
  expect(util.isId(1234)).toEqual(false)
  expect(util.isId('1234')).toEqual(false)
  expect(util.isId('5ff50fe955da2c00170de734')).toEqual(true)
})

test('util > arrayWithSchema', async () => {
  let res = monastery.prototype.arrayWithSchema([{ name: { type: 'string' }}], { minLength: 1 })
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


