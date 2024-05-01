---
title: Manager
nav_order: 2
has_children: true
---

# Manager

Monastery constructor, same as the [monk constructor](https://automattic.github.io/monk/docs/manager/).

### Arguments

`uri` *(string\|array)*: A [mongo connection string URI](https://docs.mongodb.com/manual/reference/connection-string/). Replica sets can be an array or comma separated.

[`options`] *(object)*:
  - [`hideWarnings=false`] *(boolean)*: hide monastery warnings
  - [`hideErrors=false`] *(boolean)*: hide monastery errors
  - [`defaultObjects=false`] *(boolean)*: when [inserting](../model/insert.html#defaults-example), undefined embedded documents and arrays are defined
  - [`nullObjects=false`] *(boolean)*: embedded documents and arrays can be set to null or an empty string (which gets converted to null). You can override this per field via `nullObject: true`.
  - [`timestamps=true`] *(boolean)*: whether to use [`createdAt` and `updatedAt`](../definition), this can be overridden per operation
  - [`useMilliseconds=false`] *(boolean)*: by default the `createdAt` and `updatedAt` fields that get created automatically use unix timestamps in seconds, set this to true to use milliseconds instead.
  - [`mongo options`](http://mongodb.github.io/node-mongodb-native/3.2/reference/connecting/connection-settings/)...

[`callback`] *(function)*: You may optionally specify a callback which will be called once the connection to the mongo database is opened or throws an error.

### Returns

A monk manager instance with additional Monastery methods, i.e. `model` `models`

### Example

```js
import monastery from 'monastery'
const db = monastery('localhost/mydb', options)
```

```js
import monastery from 'monastery'
const db = monastery('localhost/mydb,192.168.1.1') // replica set
```

```js
import monastery from 'monastery'
monastery('localhost/mydb,192.168.1.1').then((db) => {
  // db is the connected instance of the Manager
}).catch((err) => {
  // error connecting to the database
})
```

### Methods

- `manager.id(<String|ObjectId>)`: Create or convert a valid MongoDB ObjectId string into an ObjectId
- `manager.isId(String|ObjectId)`: Checks if the passed variable is a valid MongoDB ObjectId or ObjectId string
- `manager.model()`: [see model](./model.html)
- `manager.models()`: [see models](./models.html)
- `manager.getSignedUrl(path, expires, bucket)`: You can sign AWS S3 paths using this image plugin helper

### Dates

*Dates are unix timestamps in seconds, you change this to milliseconds via the [manager configurations](./manager). We hope to support other string based timestamp variations soon..*
