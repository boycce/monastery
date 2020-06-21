---
title: remove
parent: Model
---

# `model.remove`

Remove document(s) in a collection and call related hooks: `schema.beforeRemove`,  `schema.afterRemove`

### Arguments

`options` *(object)*

- `options.query` *(object\|id)*
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#remove)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.remove({ query: { name: "Martin Luther" }})
```
