---
title: insert
parent: Model
---

# `model.insert`

Validate and insert document(s) in a collection and call related hooks: `schema.beforeInsert`,  `schema.afterInsert`

### Arguments

1. `options` *(object)*
  - `options.data` *(object\|array)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#insert)]...
3. [`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.insert({ data: { name: 'Martin Luther' }})
user.insert({ data: [{ name: 'Martin Luther' }, { name: 'Bruce Lee' }]})
```

### Defaults example

When defaults is enabled, undefined subdocuments and arrays will default to `{}` `[]` respectively when inserting. You can enable `defaults` via the [manager options](../manager#arguments).

```js
db.model({ fields: {
  names: [{ type: 'string' }],
  pets: { 
    name: { type: 'string' },
    colors: [{ type: 'string' }]
  }
}})

user.insert({ data: {} }).then(data => {
  // data = {
  //   names: [],
  //   pets: { colors: [] }
  // }
})
```
