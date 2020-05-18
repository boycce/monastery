---
title: remove
parent: Model
---

# `model.remove`

Remove document(s) in a collection and call related hooks: `schema.beforeRemove`,  `schema.afterRemove`

#### Arguments

1. `options` *(object)*
  - `options.query` *(object\|id)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#remove)]
2. [`callback`] *(function)*: pass instead of return a promise

#### Returns

A promise if no callback is passed in.

#### Example

```js
db.user.remove({ query: { name: "Martin Luther" }})
```
