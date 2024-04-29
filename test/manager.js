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

test('manager > onError', async () => {
  // Bad port (thrown by MongoDB)
  const db = monastery('localhost:1234/monastery', { serverSelectionTimeoutMS: 500 })
  let error, isAPromise
  await db.onError((res) => { error = res.message }).then(() => { isAPromise = true })
  expect(error).toEqual('connect ECONNREFUSED 127.0.0.1:1234')
  expect(isAPromise).toEqual(true)
  db.close()
})

test('manager > onOpen', async () => {
  const db = monastery('localhost/monastery', { serverSelectionTimeoutMS: 500 })

  let manager1
  await db.onOpen((res) => { manager1 = res })
  expect(manager1.open).toEqual(expect.any(Function))

  // Wait until after the client has been connected
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 1000)
  })

  // This should still run after the client has been connected
  let manager2
  let isAPromise
  await db.onOpen((res) => { manager2 = res }).then(() => { isAPromise = true })
  expect(manager2.open).toEqual(expect.any(Function))
  expect(isAPromise).toEqual(true)
  db.close()
})

test('manager > onOpen error', async () => {
  // Bad port (thrown by MongoDB)
  let manager
  const db = monastery('localhost:1234/monastery', { serverSelectionTimeoutMS: 500 })
  await expect(db.onOpen((res) => { manager = res })).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:1234')
  expect(manager).toEqual(undefined)
  expect(db).toEqual(expect.any(Object))
  db.close()
})

test('manager > return a promise', async () => {
  const db = await monastery('localhost/monastery', { serverSelectionTimeoutMS: 500, promise: true })
  expect(db).toEqual(expect.any(Object))
  db.close()
})

test('manager > return a promise with uri error', async () => {
  await expect(monastery('badlocalhost/monastery', { serverSelectionTimeoutMS: 500, promise: true }))
    .rejects.toThrow('getaddrinfo EAI_AGAIN badlocalhost')
})

test('manager > reuse MongoDB Client', async () => {
  const mongoClient = new MongoClient('mongodb://localhost/monastery', {})
  const db = await monastery(mongoClient, { serverSelectionTimeoutMS: 500, promise: true })
  expect(db).toEqual(expect.any(Object))
  expect(db.client).toEqual(expect.any(Object))
  expect(db.isId).toEqual(expect.any(Function))
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
  const manager = monastery('localhost/monastery', { serverSelectionTimeoutMS: 500 })
  // Basic aggregate command
  expect(await manager.get('non-collection').aggregate([], {})).toEqual([])
  // Basic find command
  expect(await manager.get('non-collection').find({})).toEqual([])
  manager.close()
})
