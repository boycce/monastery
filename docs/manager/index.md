---
title: Manager
nav_order: 2
has_children: true
---

# Manager

Monastery constructor, same as the [monk constructor](https://automattic.github.io/monk/docs/manager/).

### Arguments

1. `uri` *(string\|array)*: A [mongo connection string URI](https://docs.mongodb.com/manual/reference/connection-string/). Replica sets can be an array or comma separated.

2. [`options`] *(object)*:
    - [`defaults`] *(boolean)*: see [model.insert](/model/insert.html#defaults-example)
    - [`mongo options`](http://mongodb.github.io/node-mongodb-native/3.2/reference/connecting/connection-settings/)...

3. [`callback`] *(function)*: You may optionally specify a callback which will be called once the connection to the mongo database is opened or throws an error.

### Returns

A monk manager instance with additional Monastery methods, i.e. `model` `models`

### Example

```js
const db = require('monastery-js')('localhost/mydb', options)
```

```js
const db = require('monastery-js')('localhost/mydb,192.168.1.1') // replica set
```

```js
require('monastery-js')('localhost/mydb,192.168.1.1').then((db) => {
  // db is the connected instance of the Manager
}).catch((err) => {
  // error connecting to the database
})
```
