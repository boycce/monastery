---
title: Transactions
nav_order: 8
---

# Transactions

You can create a Mongo transaction using the `manager.client` instance:

```js
try {
  // Create a new session
  var session = db.client.startSession()
  // Start the transaction, any thrown errors rollback all operations within the callback. The callback must return a promise.
  await session.withTransaction(async () => {
    // Important:: You must pass the session to the operations
    await db.person.insert({ data, session })
  })
} catch (err) {
  console.error(err)
} finally {
  if (session) {
    await session.endSession()
  }
}
```
