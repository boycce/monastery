---
title: insert
parent: Model
---

# `model.insert`

Validate and insert document(s) in a collection and calls model hooks: `beforeInsert`,  `afterInsert`

### Arguments

`options` *(object)*

- `data` *(object\|array)* - Data that is validated against the model fields. Key names can be in dot or bracket notation which is handy for HTML FormData.
- [[`blacklist`](#blacklisting)] *(array\|string\|false)*: augment `definition.insertBL`. `false` will remove all blacklisting
- [`project`] *(string\|array\|object)*: project these fields, ignores blacklisting
- [`skipValidation`] (string\|array\|boolean): skip validation for these field name(s), or `true` for all fields
- [`timestamps`] *(boolean)*: whether `createdAt` and `updatedAt` are automatically inserted, defaults to `manager.timestamps`
- [[`any mongodb option`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#insertMany)] *(any)*

### Returns

A promise

### Example

```js
await user.insert({ data: { name: 'Martin Luther' }})
await user.insert({ data: [{ name: 'Martin Luther' }, { name: 'Bruce Lee' }]})
```

### Blacklisting

You can augment the model's blacklist (`definition.insertBL`) by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.insert({ data: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in definition.insertBL
user.insert({ data: {}, blacklist: ['-name', '-pet'] })
```

### Defaults example

When defaultObjects is enabled, undefined embedded documents and arrays will default to `{}` `[]` respectively when inserting. You can enable `defaultObjects` via the [manager options](../manager#arguments).

```js
db.model({
  fields: {
    names: [{ type: 'string' }],
    pets: {
      name: { type: 'string' },
      colors: [{ type: 'string' }]
    }
  }
})

await user.insert({ data: {} })
// data = {
//   names: [],
//   pets: { colors: [] }
// }
```
