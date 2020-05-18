---
title: insert
parent: Model
---

# `model.insert`

Validate and insert document(s) in a collection and call related hooks: `schema.beforeInsert`,  `schema.afterInsert`

#### Arguments

1. `options` *(object)*
  - `options.data` *(object\|array)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#insert)]
3. [`callback`] *(function)*: pass instead of return a promise

#### Returns

A promise if no callback is passed in.

#### Example

```js
db.user.insert({ data: { woot: 'Martin Luther' }})
db.user.insert({ data: [{ woot: 'Martin Luther' }, { woot: 'Bruce Lee' }]})
```
