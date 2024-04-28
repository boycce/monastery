const { MongoClient } = require('mongodb')
const monastery = require('../lib/index.js')

test('manager > basics', async () => {
  const manager = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
  // Manager is exposed
  expect(manager).toEqual(monastery.manager)
  // Basic find command
  expect(await manager.db.collection('non-collection').findOne({})).toEqual(null)
  // Raw MongoDB ping command
  expect(await manager.command({ ping: 1 })).toEqual({ ok: 1 })
  manager.close()
})

test('manager > uri error', async () => {
  expect(() => monastery('', {})).toThrow('No connection URI provided.')
})

test('manager > catch', async () => {
  // Bad port (thrown by MongoDB)
  const db = monastery('localhost:1234/monastery', { serverSelectionTimeoutMS: 1000 }).catch((err) => {
    expect(err.message).toEqual('connect ECONNREFUSED 127.0.0.1:1234')
  })
  // the manager is still retuned
  expect(db?.open).toEqual(expect.any(Function))
  db.close()
})

test('manager > return a promise', async () => {
  const db = await monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000, promise: true })
  expect(db).toEqual(expect.any(Object))
  db.close()
})

test('manager > return a promise with uri error', async () => {
  await expect(monastery('badlocalhost/monastery', { serverSelectionTimeoutMS: 1000, promise: true }))
    .rejects.toThrow('getaddrinfo EAI_AGAIN badlocalhost')
})

test('manager > reuse MongoDB Client', async () => {
  const mongoClient = new MongoClient('mongodb://localhost/monastery', {})
  const db = await monastery(mongoClient, { serverSelectionTimeoutMS: 2000, promise: true })
  expect(db).toEqual(expect.any(Object))
  expect(db.client).toEqual(expect.any(Object))
  expect(db.catch).toEqual(expect.any(Function))
  db.close()
})

test('manager > events', async () => {
  // note: jests tests only wait for 5s
  function eventTester(db, eventName) {
    return new Promise((resolve) => {
      db.on(eventName, () => resolve(true))
    })
  }
  // Triggers on opening/open
  const db = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
  expect(db._state).toEqual('opening')
  // Start waiting for the following events
  const promises = Promise.all([
    expect(eventTester(db, 'open')).resolves.toEqual(true),
    expect(eventTester(db, 'closing')).resolves.toEqual(true),
    expect(eventTester(db, 'close')).resolves.toEqual(true),
  ])
  // Triggers closing/close
  db.close()
  return promises
})

test('Manager > get collection', async () => {
  const manager = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
  // Basic aggregate command
  expect(await manager.get('non-collection').aggregate([], {})).toEqual([])
  // Basic find command
  expect(await manager.get('non-collection').find({})).toEqual([])
  manager.close()
})
