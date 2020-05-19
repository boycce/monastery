---
title: update
parent: Model
---

# `model.update`

Update document(s) in a collection and call related hooks: `schema.beforeUpdate`,  `schema.afterUpdate`

### Arguments

1. `options` *(object)*
  - `options.query` *(object\|id)*
  - `options.data` *(object)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#update)]...
3. [`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.update({ query: { name: 'foo' }, data: { name: 'bar' }})
```
