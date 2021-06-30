---
title: insert
parent: Model
---

# `model.insert`

Validate and insert document(s) in a collection and call related hooks: `schema.beforeInsert`,  `schema.afterInsert`

### Arguments

`options` *(object)*

- `options.data` *(object\|array)* - Data that is validated against the model schema. Key names can be in dot or bracket notation which is handy for HTML FormData.
- [`options.skipValidation`] (string\|array): skip validation for this field name(s)
- [`timestamps`] *(boolean)*: whether `createdAt` and `updatedAt` are automatically inserted, defaults to `manager.timestamps`
- [`options.blacklist`] *(array\|string\|false)*: augment `schema.insertBL`. `false` will remove all blacklisting
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#insert)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.insert({ data: { name: 'Martin Luther' }})
user.insert({ data: [{ name: 'Martin Luther' }, { name: 'Bruce Lee' }]})
```

### Blacklisting

You can augment the model's `schema.insertBL` blacklist by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.insert({ data: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in schema.insertBL
user.insert({ data: {}, blacklist: ['-name', '-pet'] })
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
