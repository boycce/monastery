const { MongoClient } = require('mongodb')
const monastery = require('../lib/index.js')

test('manager > basics', async () => {
  const db = monastery.manager('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
  // Manager is exposed
  expect(monastery.uri).toEqual(expect.any(String))
  // Basic find command
  expect(await db.db.collection('non-collection').findOne({})).toEqual(null)
  // Raw MongoDB ping command
  expect(await db.rawCommand({ ping: 1 })).toMatchObject({ ok: 1 }) // cluster connections return extra fields
  db.close()
})

test('manager > uri error', async () => {
  expect(() => monastery.manager('', {})).toThrow('No monastery connection URI provided.')
})

test('manager > onError', async () => {
  // Bad port (thrown by MongoDB)
  const db = monastery.manager('localhost:1234/monastery', { serverSelectionTimeoutMS: 500 })
  let error, isAPromise
  await db.onError((res) => { error = res.message }).then(() => { isAPromise = true })
  expect(error).toEqual('connect ECONNREFUSED 127.0.0.1:1234')
  expect(isAPromise).toEqual(true)
  db.close()
})

test('manager > onOpen', async () => {
  const db = monastery.manager('localhost/monastery', { serverSelectionTimeoutMS: 500 })

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
  const db = monastery.manager('localhost:1234/monastery', { serverSelectionTimeoutMS: 500 })
  await expect(db.onOpen((res) => { manager = res })).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:1234')
  expect(manager).toEqual(undefined)
  expect(db).toEqual(expect.any(Object))
  db.close()
})

test('manager > return a promise', async () => {
  const db = await monastery.manager('localhost/monastery', { serverSelectionTimeoutMS: 500, promise: true })
  expect(db).toEqual(expect.any(Object))
  db.close()
})

test('manager > return a promise with uri error', async () => {
  await expect(monastery.manager('badlocalhost/monastery', { serverSelectionTimeoutMS: 500, promise: true }))
    .rejects.toThrow('getaddrinfo EAI_AGAIN badlocalhost')
})

test('manager > reuse MongoDB Client', async () => {
  const mongoClient = new MongoClient('mongodb://localhost/monastery', {})
  const db = await monastery.manager(mongoClient, { serverSelectionTimeoutMS: 500, promise: true })
  expect(db).toEqual(expect.any(Object))
  expect(db.client).toEqual(expect.any(Object))
  expect(db.isId).toEqual(expect.any(Function))
  db.close()
})

test('manager > events', async () => {
  // note: jests tests only wait for 5s
  function eventTester(db, eventName) {
    return new Promise((resolve) => {
      db.emitter.on(eventName, () => resolve(true))
    })
  }
  // Triggers on opening/open
  const db = monastery.manager('localhost/monastery', { serverSelectionTimeoutMS: 2000 })
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
  const db = monastery.manager('localhost/monastery', { serverSelectionTimeoutMS: 500 })
  // Basic aggregate command
  expect(await db.get('non-collection').aggregate([], {})).toEqual([])
  // Basic find command
  expect(await db.get('non-collection').find({})).toEqual([])
  db.close()
})

test('Manager > multiple managers', async () => {
  const db1 = monastery.manager('localhost/monastery', { logLevel: 5 })
  const db2 = monastery.manager('localhost/monastery', { logLevel: 6 })
  const db3 = monastery.manager('localhost/monastery', { logLevel: 7 })

  expect(monastery.opts.logLevel).not.toEqual(6) // default manager
  expect(db2.opts.logLevel).not.toEqual(db1.opts.logLevel)
  expect(db3.opts.logLevel).not.toEqual(db2.opts.logLevel)

  db1.close()
  db2.close()
  db3.close()
})
