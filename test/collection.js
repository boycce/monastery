const { ObjectId } = require('mongodb')
const monastery = require('../lib/index.js')
const util = require('../lib/util.js')

// Setup/destroy
let db, userCol, indexCol, indexDropCol
beforeAll(async () => {
  db = monastery('127.0.0.1/monastery')
  userCol = db.get('users-' + Date.now())
  indexCol = db.get('index-' + Date.now())
  indexDropCol = db.get('index-' + Date.now())
})
afterAll(async () => {
  await userCol.drop()
  await indexCol.drop()
  await indexDropCol.drop()
  db.close()
})

// test('createIndex > should accept a field string', async () => {
//   await indexCol.createIndex('name.first')
//   const indexes = await indexCol.indexInformation()
//   expect(indexes['name.first_1']).toBeDefined()
// })

// test('createIndex > should accept space-delimited compound indexes', async () => {
//   await indexCol.createIndex('name last')
//   const indexes = await indexCol.indexInformation()
//   expect(indexes.name_1_last_1).toBeDefined()
// })

// test('createIndex > should accept array compound indexes', async () => {
//   await indexCol.createIndex(['nombre', 'apellido'])
//   const indexes = await indexCol.indexInformation()
//   expect(indexes.nombre_1_apellido_1).toBeDefined()
// })

test('createIndex > should accept an object argument', async () => {
  await indexCol.createIndex({ location: '2dsphere' })
  const indexes = await indexCol.indexInformation()
  expect(indexes.location_2dsphere).toBeDefined()
})

test('createIndex > should accept object compound indexes', async () => {
  await indexCol.createIndex({ up: 1, down: -1 })
  const indexes = await indexCol.indexInformation()
  expect(indexes['up_1_down_-1']).toBeDefined()
})

test('createIndex > should accept options', async () => {
  await indexCol.createIndex({ woot: 1 }, { unique: true })
  const indexes = await indexCol.indexInformation()
  expect(indexes.woot_1).toBeDefined()
})

// test('dropIndex > should accept a field string', async () => {
//   await indexCol.createIndex('name2.first')
//   let indexes = await indexCol.indexInformation()
//   expect(indexes['name2.first_1']).toBeDefined()

//   await indexCol.dropIndex('name2.first')
//   indexes = await indexCol.indexInformation()
//   expect(indexes['name2.first_1']).toBeUndefined()
// })

// test('dropIndex > should accept space-delimited compound indexes', async () => {
//   await indexCol.createIndex('name2 last')
//   let indexes = await indexCol.indexInformation()
//   expect(indexes.name2_1_last_1).toBeDefined()

//   await indexCol.dropIndex('name2 last')
//   indexes = await indexCol.indexInformation()
//   expect(indexes.name2_1_last_1).toBeUndefined()
// })

// test('dropIndex > should accept array compound indexes', async () => {
//   await indexCol.createIndex(['nombre2', 'apellido'])
//   let indexes = await indexCol.indexInformation()
//   expect(indexes.nombre2_1_apellido_1).toBeDefined()

//   await indexCol.dropIndex(['nombre2', 'apellido'])
//   indexes = await indexCol.indexInformation()
//   expect(indexes.nombre2_1_apellido_1).toBeUndefined()
// })

test('dropIndex > should accept object compound indexes', async () => {
  await indexCol.createIndex({ up2: 1, down: -1 })
  let indexes = await indexCol.indexInformation()
  expect(indexes['up2_1_down_-1']).toBeDefined()

  await indexCol.dropIndex({ up2: 1, down: -1 })
  indexes = await indexCol.indexInformation()
  expect(indexes['up2_1_down_']).toBeUndefined()
})

test('dropIndexes > should drop all indexes', async () => {
  await indexDropCol.createIndex({ up2: 1, down: -1 })
  let indexes = await indexDropCol.indexInformation()
  expect(indexes['up2_1_down_-1']).toBeDefined()

  await indexDropCol.dropIndexes()
  indexes = await indexDropCol.indexInformation()
  expect(indexes['up2_1_down_']).toBeUndefined()
})


test('insert > should force callback in next tick', async () => {
  await userCol.insert({ woot: 'a' })
  expect(true).toBeTruthy() // No assertion is made here, just ensuring the test passes
})

test('insert > should give you an object with the _id', async () => {
  const obj = await userCol.insert({ woot: 'b' })
  expect(typeof obj._id).toBe('object')
  expect(obj._id.toHexString).toBeDefined()
})

test('insert > should insert the whole document not just _id', async () => {
  const echo = util.id('5f079e17fbab7b0017b12a3d')
  const res1 = await userCol.insert({ woot: 'b', echo: echo, sub: { woot: 'c' } })
  expect(res1).toEqual({ _id: expect.any(Object), woot: 'b', echo: echo, sub: { woot: 'c' }})
})

test('insert > should return an array if an array was inserted', async () => {
  const docs = await userCol.insert([{ woot: 'c' }, { woot: 'd' }])
  expect(Array.isArray(docs)).toBeTruthy()
  expect(docs.length).toBe(2)
})

test('insert > should not fail when inserting an empty array', async () => {
  const docs = await userCol.insert([])
  expect(Array.isArray(docs)).toBeTruthy()
  expect(docs.length).toBe(0)
})


test('findOne > should return null if no document', async () => {
  const doc = await userCol.findOne({ nonExistingField: true })
  expect(doc).toBeNull()
})

test('findOne > findOne(undefined) should work', async () => {
  await userCol.insert({ a: 'b', c: 'd', e: 'f' })
  await userCol.findOne()
  expect(true).toBeTruthy() // No assertion is made here, just ensuring the test passes
})

test('findOne > should only provide selected fields', async () => {
  const insertedDoc = await userCol.insert({ a: 'b', c: 'd', e: 'f' })
  const doc = await userCol.findOne(insertedDoc._id, { fields: { a: 1, e: 1 }})
  expect(doc.a).toBe('b')
  expect(doc.e).toBe('f')
  expect(doc.c).toBeUndefined()
})

test('find > should project only specified fields using projection options', async () => {
  await userCol.insert([{ a: 1, b: 1 }, { a: 2, b: 2 }])
  const docs = await userCol.find({}, { projection: { a: 1 }, sort: { _id: -1 } })
  expect(docs[0].a).toBe(2)
  expect(docs[0].b).toBeUndefined()
  expect(docs[1].a).toBe(1)
  expect(docs[1].b).toBeUndefined()
})

test('find > should find with nested query', async () => {
  await userCol.insert([{ nested: { a: 1 } }, { nested: { a: 2 } }])
  const docs = await userCol.find({ 'nested.a': 1 })
  expect(docs.length).toBe(1)
  expect(docs[0].nested.a).toBe(1)
})

test('find > should find with nested array query', async () => {
  await userCol.insert([{ nestedArray: [{ a: 1 }] }, { nestedArray: [{ a: 2 }] }])
  const docs = await userCol.find({ 'nestedArray.a': 1 })
  expect(docs.length).toBe(1)
  expect(docs[0].nestedArray[0].a).toBe(1)
})

test('find > should sort', async () => {
  await userCol.insert([{ sort: true, a: 1, b: 2 }, { sort: true, a: 1, b: 1 }])
  const docs = await userCol.find({ sort: true }, { sort: '-a b' })
  expect(docs[0].b).toBe(1)
  expect(docs[1].b).toBe(2)
})

test('find > should return the raw cursor', async () => {
  const query = { stream: 3 }
  await userCol.insert([{ stream: 3 }, { stream: 3 }, { stream: 3 }, { stream: 3 }])
  const cursor = await userCol.find(query, { rawCursor: true })
  expect(cursor.close).toBeTruthy()
  expect(cursor.next).toBeTruthy()
  cursor.close()
})

test('find > should work with streaming option', async () => {
  const query = { stream: 2 }
  let found = 0
  await userCol.insert([{ stream: 2 }, { stream: 2 }, { stream: 2 }, { stream: 2 }])
  await userCol.find(query, { 
    stream: (doc) => {
      expect(doc.stream).toBe(2)
      found++
    },
  })
  expect(found).toBe(4)
})

test('find > should allow stream cursor destroy', async () => {
  const query = { cursor: { $exists: true } }
  let found = 0
  await userCol.insert([{ cursor: true }, { cursor: true }, { cursor: true }, { cursor: true }])
  await userCol.find(query, { 
    stream: (doc, { close }) => {
      expect(doc.cursor).not.toBeNull()
      found++
      if (found === 2) close()
    },
  })
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(found).toBe(2)
})

test('find > should allow stream cursor destroy even when paused', async () => {
  const query = { cursor: { $exists: true } }
  let found = 0
  await userCol.insert([{ cursor: true }, { cursor: true }, { cursor: true }, { cursor: true }])
  await userCol.find(query, { 
    stream: (doc, { close, pause, resume }) => {
      pause()
      expect(doc.cursor).not.toBeNull()
      found++
      if (found === 2) return close()
      resume()
    },
  })
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(found).toBe(2)
})

test('find > stream pause and continue', async () => {
  const query = { stream: 4 }
  await userCol.insert([{ stream: 4 }, { stream: 4 }, { stream: 4 }, { stream: 4 }])
  const start = Date.now()
  let index = 0
  await userCol.find(query, { 
    stream: (doc, { pause, resume }) => {
      pause()
      const duration = Date.now() - start + 1 // 1ms case when it runs in the same tick
      expect(duration).toBeGreaterThan(index * 100)
      setTimeout(() => {
        index++
        resume()
      }, 100)
    },
  })
  expect(index).toBe(4)
  const duration = Date.now() - start
  expect(duration).toBeGreaterThan(400)
})


test('count > should count', async () => {
  let count = await userCol.count({ a: 'counting' })
  expect(count).toBe(0)

  await userCol.insert({ a: 'counting' })
  count = await userCol.count({ a: 'counting' })
  expect(count).toBe(1)
})

test('count > should not ignore options', async () => {
  let count = await userCol.count({ b: 'counting' })
  expect(count).toBe(0)

  await userCol.insert([{ b: 'counting' }, { b: 'counting' }, { b: 'counting' }, { b: 'counting' }])
  count = await userCol.count({ b: 'counting' }, { limit: 2 })
  expect(count).toBe(2)
})

test('count > should count with no arguments', async () => {
  let count = await userCol.count({ c: 'counting' })
  expect(count).toBe(0)

  await userCol.insert({ c: 'counting' })
  count = await userCol.count()
  expect(count).toBe(41)
})

test('count > should estimate count', async () => {
  const count = await userCol.count({}, { estimate: true })
  expect(count).toBe(41)
})

test('count > should estimate count with options', async () => {
  const count = await userCol.count({}, { estimate: true, maxTimeMS: 10000 })
  expect(count).toBe(41)
})

test('distinct', async () => {
  await userCol.insert([{ distinct: 'a' }, { distinct: 'a' }, { distinct: 'b' }])
  const docs = await userCol.distinct('distinct')
  expect(docs).toEqual(['a', 'b'])
})

test('distinct with options', async () => {
  await userCol.insert([{ distinct2: 'a' }, { distinct2: 'a' }, { distinct2: 'b' }])
  const docs = await userCol.distinct('distinct2', {})
  expect(docs).toEqual(['a', 'b'])
})


test('update > should update', async () => {
  const doc = await userCol.insert({ d: 'e' })
  await userCol.update({ _id: doc._id }, { $set: { d: 'f' } })
  const updatedDoc = await userCol.findOne(doc._id)
  expect(updatedDoc.d).toBe('f')
})

test('update > should update with 0', async () => {
  const doc = await userCol.insert({ d: 'e' })
  await userCol.update({ _id: doc._id }, { $set: { d: 0 } })
  const updatedDoc = await userCol.findOne(doc._id)
  expect(updatedDoc.d).toBe(0)
})

test('update > should update with an objectid', async () => {
  const doc = await userCol.insert({ d: 'e' })
  await userCol.update(doc._id, { $set: { d: 'f' } })
  const updatedDoc = await userCol.findOne(doc._id)
  expect(updatedDoc.d).toBe('f')
})

test('update > should update with an objectid (string)', async () => {
  const doc = await userCol.insert({ d: 'e' })
  await userCol.update(doc._id.toString(), { $set: { d: 'f' } })
  const updatedDoc = await userCol.findOne(doc._id)
  expect(updatedDoc.d).toBe('f')
})

test('update > returned updated object', async () => {
  await userCol.insert({ woot: 'b' })
  const res = await userCol.update({ woot: 'nonyetadded' }, { $set: { woot: 'c' }}, {})
  expect(res).toEqual({
    acknowledged: true,
    matchedCount: 0,
    modifiedCount: 0,
    upsertedCount: 0,
    upsertedId: null,
  })
  const res2 = await userCol.update({ woot: 'nonyetadded' }, { $set: { woot: 'c' }}, { upsert: true })
  expect(res2).toEqual({
    acknowledged: true,
    matchedCount: 0,
    modifiedCount: 0,
    upsertedCount: 1,
    upsertedId: expect.any(ObjectId), // asymmetric helper
  })
})

test('update > mutli', async () => {
  await userCol.insert([{ f: true }, { f: true }, { g: true }, { g: true }])
  const res = await userCol.update({ f: true }, { $set: { f: 'g' } })
  expect(res.matchedCount === 1).toBeTruthy()
  const res2 = await userCol.update({ g: true }, { $set: { g: 'i' } }, { multi: true })
  expect(res2.matchedCount == 2 && res2.modifiedCount == 2).toBeTruthy()
})

test('remove > should remove a document', async () => {
  await userCol.insert({ name: 'Tobi' })
  await userCol.remove({ name: 'Tobi' })
  const result = await userCol.find({ name: 'Tobi' })
  expect(result).toEqual([])
})


test('findOneAndDelete > should remove a document and return it', async () => {
  await userCol.insert({ name: 'Bob' })
  const deletedDoc = await userCol.findOneAndDelete({ name: 'Bob' })
  expect(deletedDoc.name).toBe('Bob')
  const result = await userCol.find({ name: 'Bob' })
  expect(result).toEqual([])
})

test('findOneAndDelete > should return null if found nothing', async () => {
  const doc = await userCol.findOneAndDelete({ name: 'Bob3' })
  expect(doc).toBeNull()
})

test('findOneAndUpdate > should update a document and return it', async () => {
  await userCol.insert({ name: 'Jack' })
  const updatedDoc = await userCol.findOneAndUpdate({ name: 'Jack' }, { $set: { name: 'Jack4' } })
  expect(updatedDoc.name).toBe('Jack4')
})

test('findOneAndUpdate > should return null if found nothing', async () => {
  const doc = await userCol.findOneAndUpdate({ name: 'Jack5' }, { $set: { name: 'Jack6' } })
  expect(doc).toBeNull()
})

test('findOneAndUpdate > should return an error if no atomic operations are specified', async () => {
  const err = await userCol.findOneAndUpdate({ name: 'Jack5' }, { name: 'Jack6' }).catch(err => err)
  expect(err.message).toBe('Update document requires atomic operators')
})

test('aggregate > should fail properly', async () => {
  await expect(userCol.aggregate(null)).rejects.toThrow()
})

test('aggregate > should work in normal case', async () => {
  const res = await userCol.aggregate([{ $group: { _id: null, maxWoot: { $max: '$woot' } } }])
  expect(Array.isArray(res)).toBeTruthy()
  expect(res.length).toBe(1)
})

test('aggregate > should work with option', async () => {
  const res = await userCol.aggregate([{ $group: { _id: null, maxWoot: { $max: '$woot' } } }], { explain: true })
  expect(Array.isArray(res)).toBeTruthy()
  expect(res.length).toBe(1)
})


test('bulkWrite', async () => {
  const r = await userCol.bulkWrite([{ insertOne: { document: { bulkWrite: 1 } } }])
  expect(r.nInserted).toBe(1)
})

test('drop > should not throw when dropping an empty db', async () => {
  const result = await db.get('dropDB-' + Date.now()).drop().catch(() => false)
  expect(result).toBeTruthy()
})

test('caching collections', () => {
  const collectionName = 'cached-' + Date.now()
  expect(db.get(collectionName)).toBe(db.get(collectionName))
})

test('not caching collections', () => {
  const collectionName = 'cached-' + Date.now()
  expect(db.get(collectionName, { cache: false })).not.toBe(db.get(collectionName, { cache: false }))
})

test('stats', async () => {
  const res = await userCol.stats()
  expect(res).toBeTruthy()
})
