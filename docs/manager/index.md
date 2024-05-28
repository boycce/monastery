---
title: Manager
nav_order: 2
has_children: true
---

# Manager

Monastery manager constructor.

### Arguments

`uri` *(string\|array)*: A [mongo connection string URI](https://www.mongodb.com/docs/v5.0/reference/connection-string/). Replica sets can be an array or comma separated.

[`options`] *(object)*:
  - [`defaultObjects=false`] *(boolean)*: when [inserting](../model/insert.html#defaults-example), undefined embedded documents and arrays are defined
  - [`logLevel=2`] *(number)*: 1=errors, 2=warnings, 3=info. You can also use the debug environment variable `DEBUG=monastery:info`
  - [`nullObjects=false`] *(boolean)*: embedded documents and arrays can be set to null or an empty string (which gets converted to null). You can override this per field via `nullObject: true`.
  - [`promise=false`] *(boolean)*: return a promise instead of the manager instance
  - [`timestamps=true`] *(boolean)*: whether to use [`createdAt` and `updatedAt`](../definition), this can be overridden per operation
  - [`useMilliseconds=false`] *(boolean)*: by default the `createdAt` and `updatedAt` fields that get created automatically use unix timestamps in seconds, set this to true to use milliseconds instead.
  - [`mongo options`](https://mongodb.github.io/node-mongodb-native/5.9/interfaces/MongoClientOptions.html)...

### Returns

A manager instance.

### Example

```js
import monastery from 'monastery'

const db = monastery('localhost/mydb', options)
// replica set
const db = monastery('localhost/mydb,192.168.1.1')
// you can wait for the connection (which is not required before calling methods)
const db = await monastery('localhost/mydb,192.168.1.1', { promise: true })
```

You can also listen for errors or successful connection using these hooks
```js
db.onOpen((manager) => {
  // manager.client is connected...
})
db.onError((err) => {
  // connection error
})
```

### Properties

- `manager.db`: Raw Mongo db instance
- `manager.client`: Raw Mongo client instance. *You can use this to create a transaction, e.g. `await db.client.startSession().withTransaction(async () => {...})`*

### Methods

- `manager.id(<String|ObjectId>)`: Create or convert a valid MongoDB ObjectId string into an ObjectId
- `manager.isId(String|ObjectId)`: Checks if the passed variable is a valid MongoDB ObjectId or ObjectId string
- `manager.model()`: [see model](./model.html)
- `manager.models()`: [see models](./models.html)
- `manager.onError(Function)`: Catches connection errors
- `manager.onOpen(Function)`: Triggers on successful connection
- `manager.getSignedUrl(path, expires, bucket)`: You can sign AWS S3 paths using this image plugin helper

### Dates

*Dates are unix timestamps in seconds, you change this to milliseconds via the [manager configurations](./manager). We hope to support other string based timestamp variations soon..*
