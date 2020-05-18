---
title: find
parent: Model
---

# `model.find`

Find document(s) in a collection and call related hook: `schema.afterFind`

#### Arguments

1. `options` *(object)*
  - `options.query` *(object\|id)*
  - [`options.project`] *(object)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#find)]
2. [`callback`] *(function)*: pass instead of return a promise

#### Returns

A promise if no callback is passed in.

#### Example

```js
db.user.find({ query: "5ebdd6677466b95109aa278e" }).then(data => {
  // {..}
}) 

db.user.find({ query: { name: "Martin Luther" }}).then(data => {
  // [{..}]
})

db.user.find({ query: { name: "Martin Luther" }, limit: 100 }).then(data => {
  // [{..}]
})
```
