---
title: update
parent: Model
---

# `model.update`

Update document(s) in a collection and call related hooks: `schema.beforeUpdate`,  `schema.afterUpdate`. By default this method method updates a single document. Set the `multi` mongodb option to update all documents that match the query criteria.

### Arguments

`options` *(object)*

- `options.query` *(object\|id)*
- `options.data` *(object)* - data that's validated against the model schema and then wrapped in `{ $set: .. }`, [`more below`](#data)
- [`options.skipValidation`] (string\|array): skip validation for this field name(s)
- [`options.sort`] *(string\|object\|array)*: same as the mongodb option, but  allows for string parsing e.g. 'name', 'name:1'
- [`options.timestamps`] *(boolean)*: whether `updatedAt` is automatically updated, defaults to the `manager.timestamps` value
- [`options.blacklist`] *(array\|string\|false)*: augment `schema.updateBL`. `false` will remove all blacklisting
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#update)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.update({ query: { name: 'foo' }, data: { name: 'bar' }})
```

### Data

Data that is validated against the model schema and then wrapped in `{ $set: .. }`. Key names can be in dot or bracket notation which is handy for HTML FormData.

You can also pass `options.$set` or any other mongodb update operation instead of `options.data`, which bypasses validation, e.g.

```js
user.update({ query: {}, data: { name: 'Martin', badField: 1 }})
// = { $set: { name: 'Martin' }}
user.update({ query: {}, $set: { name: 'Martin', badField: 1 }})
// = { $set: { name: 'Martin', badField: 1 }}
user.update({ query: {}, $pull: { name: 'Martin', badField: 1 }})
// = { $pull: { name: 'Martin', badField: 1 }}
```

### Blacklisting

You can augment the model's `schema.updateBL` blacklist by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.update({ query: {}, data: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in schema.updateBL
user.update({ query: {}, data: {}, blacklist: ['-name', '-pet'] })
