---
title: update
parent: Model
---

# `model.update`

Update document(s) in a collection and calls model hooks: `beforeValidate`,  `beforeUpdate`,  `afterUpdate`. By default this method method updates a single document. Set the `multi` mongodb option to update all documents that match the query criteria.

### Arguments

`options` *(object)*

- `query` *(object\|id)*: [`MongoDB query document`](https://www.mongodb.com/docs/v5.0/tutorial/query-documents/), or id
- [`data`](#data) *(object)* - data that's validated against the model fields (always wrapped in `{ $set: .. }`)
- [[`blacklist`](#blacklisting)]*(array\|string\|false)*: augment `definition.updateBL`. `false` will remove all blacklisting
- [`project`] *(string\|array\|object)*: project these fields, ignores blacklisting
- [`skipValidation`] *(string\|array\|boolean)*:  skip validation for these fields, or pass `true` to skip all fields and validation hooks
- [`sort`] *(string\|object\|array)*: same as the mongodb option, but  allows for string parsing e.g. 'name', 'name:1'
- [`timestamps`] *(boolean)*: whether `updatedAt` is automatically updated, defaults to the `manager.timestamps` value
- [[`any mongodb option`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#updateMany)] *(any)*

### Returns

`{Promise<Object>}` A promise that resolves to an object with the updated fields.
 
You can also access the native MongoDB output via `result._output`, a prototype property:
```js
{
  acknowledged: true,
  modifiedCount: 1,
  matchedCount: 1,
  ...
}
```

### Example

```js
await user.update({ query: { name: 'foo' }, data: { name: 'bar' }})
```

### Data

Data that's validated against the model fields (always wrapped in `{ $set: .. }`). Key names can be in dot or bracket notation which is handy for HTML FormData.

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

You can augment the model's blacklist (`updateBL`) by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.update({ query: {}, data: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in updateBL
user.update({ query: {}, data: {}, blacklist: ['-name', '-pet'] })
