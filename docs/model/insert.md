---
title: insert
parent: Model
---

# `model.insert`

Validate and insert document(s) in a collection and call related hooks: `schema.beforeInsert`,  `schema.afterInsert`

### Arguments

`options` *(object)*

- `options.data` *(object\|array)*
- [`options.whitelist`] (boolean\|array): override schema.insertBl, `true` will remove all blacklisting
- [`options.skipValidation`] (string\|array): skip validation for this field name(s)
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#insert)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.insert({ data: { name: 'Martin Luther' }})
user.insert({ data: [{ name: 'Martin Luther' }, { name: 'Bruce Lee' }]})
```

### Defaults example

When defaultObjects is enabled, undefined subdocuments and arrays will default to `{}` `[]` respectively when inserting. You can enable `defaultObjects` via the [manager options](../manager#arguments).

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
