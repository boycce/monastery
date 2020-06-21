---
title: update
parent: Model
---

# `model.update`

Update document(s) in a collection and call related hooks: `schema.beforeUpdate`,  `schema.afterUpdate`. By default this method method updates a single document. Set the `multi` mongodb option to update all documents that match the query criteria.

### Arguments

`options` *(object)*

- `options.query` *(object\|id)*
- `options.data` *(object)* - mongodb operations which are wrapped in `{ $set: .. }`
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#update)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.update({ query: { name: 'foo' }, data: { name: 'bar' }})
```
